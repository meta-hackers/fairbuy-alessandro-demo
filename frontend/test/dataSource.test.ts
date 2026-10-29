import { describe, expect, it, vi } from "vitest";
import { fixturesByCategory, laptopSpec, rankOffers, type Constraint } from "@fairbuy/core";
import { backendSource, localSource } from "../src/dataSource";

const constraints: Constraint[] = [
  { attribute: "total", op: "<=", value: 70000, hard: true },
  { attribute: "ramGb", op: ">=", value: 16, hard: true },
  { attribute: "chargerIncluded", op: "=", value: true, hard: false },
];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("localSource", () => {
  it("ranks the fixtures in the browser", async () => {
    const view = await localSource.compare(laptopSpec, constraints);
    expect(view.source).toBe("local");
    expect(view.result.ranked.map((r) => r.offerId)).toEqual(["fixture-a", "fixture-c"]);
    expect(view.result.excluded.map((e) => e.offerId)).toEqual(["fixture-b"]);
    expect(view.offers).toHaveLength(3);
  });
});

describe("localSource.interpret", () => {
  it("runs the keyword interpreter in the browser", async () => {
    const result = await localSource.interpret("laptop, almeno 16 GB di RAM");
    expect(result).toEqual({ interpreter: "keyword", category: "laptop", constraints: [constraints[1]], textRequirements: [], notes: [] });
  });
});

describe("backendSource", () => {
  it("posts the text to the interpretations endpoint", async () => {
    const proposal = { interpreter: "keyword", category: "laptop", constraints, textRequirements: [], notes: [] };
    const fetchMock = vi.fn(async () => jsonResponse(200, proposal));
    expect(await backendSource("", fetchMock).interpret("laptop")).toEqual(proposal);
    expect(fetchMock).toHaveBeenCalledWith("/v1/interpretations", expect.objectContaining({ body: JSON.stringify({ text: "laptop" }) }));
  });

  it("rejects a malformed interpretation", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { category: 1 }));
    await expect(backendSource("", fetchMock).interpret("laptop")).rejects.toThrow("Unexpected response");
  });

  it("posts the request and returns the comparison", async () => {
    const offers = [...fixturesByCategory.laptop!];
    const result = rankOffers({ offers, constraints, spec: laptopSpec });
    const fetchMock = vi.fn(async () => jsonResponse(201, { id: "1", offers, result }));

    const view = await backendSource("http://api.test/", fetchMock).compare(laptopSpec, constraints);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/v1/comparisons", expect.objectContaining({ method: "POST" }));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ category: "laptop", constraints });
    expect(view).toEqual({ source: "backend", offers, result });
  });

  it("surfaces the backend error message", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(400, { message: 'Unsupported category "x".' }));
    await expect(backendSource("", fetchMock).compare(laptopSpec, constraints)).rejects.toThrow('Unsupported category "x".');
  });

  it("explains an unreachable backend", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(backendSource("", fetchMock).compare(laptopSpec, constraints)).rejects.toThrow(/not reachable at \/v1\/comparisons/);
  });

  it("rejects a response that is not a comparison", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(201, { hello: "world" }));
    await expect(backendSource("", fetchMock).compare(laptopSpec, constraints)).rejects.toThrow("Unexpected response");
  });

  it("rejects offers that break the contract", async () => {
    const result = rankOffers({ offers: [], constraints, spec: laptopSpec });
    const fetchMock = vi.fn(async () => jsonResponse(201, { offers: [{ id: "x" }], result }));
    await expect(backendSource("", fetchMock).compare(laptopSpec, constraints)).rejects.toThrow();
  });
});
