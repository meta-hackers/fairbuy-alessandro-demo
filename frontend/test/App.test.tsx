import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { EXAMPLE_REQUEST } from "../src/components/AskPanel";
import { localSource, type DataSource } from "../src/dataSource";

const local = () => localSource;

async function askAndCompare(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: "What are you looking for?" }), text);
  await user.click(screen.getByRole("button", { name: "Read my request" }));
  await user.click(screen.getByRole("button", { name: "Compare offers" }));
}

describe("App", () => {
  it("starts empty: no requirements and no results", () => {
    render(<App initialSource="local" resolveSource={local} />);
    expect(screen.getByText(/No requirements yet/)).toBeTruthy();
    expect(screen.getByText(/Results appear here/)).toBeTruthy();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("turns the example request into requirements, then ranks: A first, C needs checking, B excluded", async () => {
    const user = userEvent.setup();
    render(<App initialSource="local" resolveSource={local} />);

    await user.click(screen.getByRole("button", { name: "Use the example" }));
    await user.click(screen.getByRole("button", { name: "Read my request" }));

    const form = screen.getByRole("form", { name: "Requirements" });
    expect((within(form).getByRole("spinbutton", { name: "Budget value" }) as HTMLInputElement).value).toBe("700");
    expect((within(form).getByRole("spinbutton", { name: "RAM value" }) as HTMLInputElement).value).toBe("16");
    expect((within(form).getByRole("combobox", { name: /^Charger included/ }) as HTMLSelectElement).value).toBe("preferred");
    expect(within(form).queryByRole("spinbutton", { name: "Storage value" })).toBeNull();
    expect(form.textContent).toContain("Cerco un portatile usato per programmare");
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Compare offers" }));

    const first = await screen.findByRole("article", { name: /^Rank 1:/ });
    expect(first.textContent).toContain("refurbished laptop, seller X");
    expect(first.textContent).toContain("Feasible");
    const second = screen.getByRole("article", { name: /^Rank 2:/ });
    expect(second.textContent).toContain("Needs checking");
    expect(second.textContent).toContain("from €648.00");
    expect(screen.getByText(/ramGb 8 >= 16/)).toBeTruthy();
    expect(EXAMPLE_REQUEST).toContain("16 GB");
  });

  it("lets the user remove and add requirements before comparing", async () => {
    const user = userEvent.setup();
    render(<App initialSource="local" resolveSource={local} />);
    await askAndCompare(user, "laptop, almeno 16 GB di RAM");
    await screen.findByRole("article", { name: /^Rank 1:/ });
    expect(screen.getAllByRole("article")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remove RAM" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Add requirement" }), "warrantyMonths");
    await user.type(screen.getByRole("spinbutton", { name: "Warranty value" }), "12");
    await user.click(screen.getByRole("button", { name: "Compare offers" }));

    // RAM no longer excludes B. Only A states a warranty: B and C need checking.
    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("article", { name: /seller X/ }).textContent).toContain("Feasible");
    expect(screen.getByRole("article", { name: /seller Y/ }).textContent).toContain("Needs checking");
    expect(screen.getByRole("article", { name: /seller Z/ }).textContent).toContain("Needs checking");
  });

  it("says when no supported category is recognized", async () => {
    const user = userEvent.setup();
    render(<App initialSource="local" resolveSource={local} />);
    await user.type(screen.getByRole("textbox", { name: "What are you looking for?" }), "Cerco una bici da corsa");
    await user.click(screen.getByRole("button", { name: "Read my request" }));
    expect(screen.getByRole("list", { name: "Interpreter notes" }).textContent).toContain("No supported category recognized");
  });

  it("shows the error when the source fails", async () => {
    const user = userEvent.setup();
    const failing: DataSource = {
      id: "backend",
      interpret: async () => {
        throw new Error("Backend not reachable.");
      },
      compare: async () => {
        throw new Error("Backend not reachable.");
      },
    };
    render(<App initialSource="backend" resolveSource={() => failing} />);
    await user.type(screen.getByRole("textbox", { name: "What are you looking for?" }), "laptop");
    await user.click(screen.getByRole("button", { name: "Read my request" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Backend not reachable.");
    expect((screen.getByLabelText(/Backend API/) as HTMLInputElement).checked).toBe(true);
  });
});
