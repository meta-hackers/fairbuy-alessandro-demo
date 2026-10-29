import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { localSource, type DataSource } from "../src/dataSource";

const local = () => localSource;

describe("App", () => {
  it("shows the demo ranking on load: A first, C needs checking, B excluded", async () => {
    render(<App initialSource="local" resolveSource={local} />);

    const first = await screen.findByRole("article", { name: /^Rank 1:/ });
    expect(first.textContent).toContain("refurbished laptop, seller X");
    expect(first.textContent).toContain("Feasible");

    const second = screen.getByRole("article", { name: /^Rank 2:/ });
    expect(second.textContent).toContain("Needs checking");
    expect(second.textContent).toContain("from €648.00");

    expect(screen.getByRole("heading", { name: /Excluded/ }).textContent).toContain("(1)");
    expect(screen.getByText(/ramGb 8 >= 16/)).toBeTruthy();
    expect(screen.getByRole("note").textContent).toContain("synthetic fixtures");
  });

  it("re-ranks after relaxing a requirement", async () => {
    const user = userEvent.setup();
    render(<App initialSource="local" resolveSource={local} />);
    await screen.findByRole("article", { name: /^Rank 1:/ });

    await user.selectOptions(screen.getByRole("combobox", { name: /^RAM/ }), "off");
    await user.click(screen.getByRole("button", { name: "Compare offers" }));

    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: /Excluded/ })).toBeNull();
  });

  it("shows the error when the source fails", async () => {
    const failing: DataSource = {
      id: "backend",
      compare: async () => {
        throw new Error("Backend not reachable.");
      },
    };
    render(<App initialSource="backend" resolveSource={() => failing} />);

    expect((await screen.findByRole("alert")).textContent).toBe("Backend not reachable.");
    expect((screen.getByLabelText(/Backend API/) as HTMLInputElement).checked).toBe(true);
  });
});
