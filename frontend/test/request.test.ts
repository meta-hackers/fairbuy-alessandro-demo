import { describe, expect, it } from "vitest";
import { laptopSpec, type CategorySpec, type Constraint } from "@fairbuy/core";
import { emptyDraft, fromConstraints, rowDefs, toConstraints, type Draft } from "../src/request";

const demoConstraints: Constraint[] = [
  { attribute: "total", op: "<=", value: 70000, hard: true },
  { attribute: "ramGb", op: ">=", value: 16, hard: true },
  { attribute: "chargerIncluded", op: "=", value: true, hard: false },
];

describe("toConstraints", () => {
  it("builds constraints from the rows", () => {
    const draft: Draft = {
      rows: [
        { key: "total", mode: "required", value: "700" },
        { key: "ramGb", mode: "required", value: "16" },
        { key: "chargerIncluded", mode: "preferred", value: "" },
      ],
      textRequirements: ["for programming"],
    };
    expect(toConstraints(laptopSpec, draft)).toEqual(demoConstraints);
  });

  it("returns nothing for an empty draft", () => {
    expect(toConstraints(laptopSpec, emptyDraft)).toEqual([]);
  });

  it("converts the budget to integer cents, accepting a decimal comma", () => {
    const draft: Draft = { rows: [{ key: "total", mode: "preferred", value: "699,99" }], textRequirements: [] };
    expect(toConstraints(laptopSpec, draft)).toEqual([{ attribute: "total", op: "<=", value: 69999, hard: false }]);
  });

  it("skips empty, negative or invalid numbers instead of treating them as zero", () => {
    const draft: Draft = {
      rows: [
        { key: "total", mode: "required", value: "" },
        { key: "ramGb", mode: "required", value: "-8" },
        { key: "storageGb", mode: "required", value: "abc" },
      ],
      textRequirements: [],
    };
    expect(toConstraints(laptopSpec, draft)).toEqual([]);
  });

  it("uses a maximum for attributes where lower is better", () => {
    const spec: CategorySpec = { id: "x", label: "X", attributes: [{ key: "weightKg", label: "Weight", type: "number", unit: "kg", better: "lower" }] };
    const draft: Draft = { rows: [{ key: "weightKg", mode: "required", value: "1.5" }], textRequirements: [] };
    expect(toConstraints(spec, draft)).toEqual([{ attribute: "weightKg", op: "<=", value: 1.5, hard: true }]);
  });
});

describe("rowDefs", () => {
  it("offers the budget plus number and boolean attributes", () => {
    expect(rowDefs(laptopSpec).map((d) => d.key)).toEqual(["total", "ramGb", "storageGb", "chargerIncluded", "warrantyMonths"]);
  });
});

describe("fromConstraints", () => {
  it("round-trips the demo constraints, budget first", () => {
    const shuffled = [demoConstraints[1]!, demoConstraints[2]!, demoConstraints[0]!];
    const { draft, unshown } = fromConstraints(laptopSpec, shuffled, ["for programming"]);
    expect(draft.rows.map((r) => r.key)).toEqual(["total", "ramGb", "chargerIncluded"]);
    expect(draft.rows[0]).toEqual({ key: "total", mode: "required", value: "700" });
    expect(draft.textRequirements).toEqual(["for programming"]);
    expect(unshown).toEqual([]);
    expect(toConstraints(laptopSpec, draft)).toEqual(demoConstraints);
  });

  it("reports constraints the form cannot show instead of altering them", () => {
    const odd: Constraint[] = [
      { attribute: "chargerIncluded", op: "=", value: false, hard: true },
      { attribute: "total", op: ">=", value: 10000, hard: true },
      { attribute: "ramGb", op: "<=", value: 32, hard: true },
    ];
    const { draft, unshown } = fromConstraints(laptopSpec, odd, []);
    expect(draft.rows).toEqual([]);
    expect(unshown).toEqual(odd);
  });
});
