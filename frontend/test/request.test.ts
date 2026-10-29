import { describe, expect, it } from "vitest";
import { laptopSpec } from "@fairbuy/core";
import { emptyDraft, formAttributes, laptopDemoDraft, toConstraints } from "../src/request";

describe("toConstraints", () => {
  it("builds the demo request", () => {
    expect(toConstraints(laptopSpec, laptopDemoDraft(laptopSpec))).toEqual([
      { attribute: "total", op: "<=", value: 70000, hard: true },
      { attribute: "ramGb", op: ">=", value: 16, hard: true },
      { attribute: "chargerIncluded", op: "=", value: true, hard: false },
    ]);
  });

  it("returns nothing for an empty draft", () => {
    expect(toConstraints(laptopSpec, emptyDraft(laptopSpec))).toEqual([]);
  });

  it("converts the budget to integer cents, accepting a decimal comma", () => {
    const draft = emptyDraft(laptopSpec);
    draft.budget = { mode: "preferred", value: "699,99" };
    expect(toConstraints(laptopSpec, draft)).toEqual([{ attribute: "total", op: "<=", value: 69999, hard: false }]);
  });

  it("skips empty, negative or invalid numbers instead of treating them as zero", () => {
    const draft = emptyDraft(laptopSpec);
    draft.budget = { mode: "required", value: "" };
    draft.fields.ramGb = { mode: "required", value: "-8" };
    draft.fields.storageGb = { mode: "required", value: "abc" };
    expect(toConstraints(laptopSpec, draft)).toEqual([]);
  });

  it("only offers number and boolean attributes in the form", () => {
    expect(formAttributes(laptopSpec).map((a) => a.key)).toEqual(["ramGb", "storageGb", "chargerIncluded", "warrantyMonths"]);
  });

  it("uses a maximum for attributes where lower is better", () => {
    const spec = { id: "x", label: "X", attributes: [{ key: "weightKg", label: "Weight", type: "number" as const, unit: "kg", better: "lower" as const }] };
    const draft = emptyDraft(spec);
    draft.fields.weightKg = { mode: "required", value: "1.5" };
    expect(toConstraints(spec, draft)).toEqual([{ attribute: "weightKg", op: "<=", value: 1.5, hard: true }]);
  });
});
