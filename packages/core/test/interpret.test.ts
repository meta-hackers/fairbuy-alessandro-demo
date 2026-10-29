import { describe, expect, it } from "vitest";
import { categorySpecs, interpretKeywords, KEYWORD_INTERPRETER, validateInterpretation } from "../src";
import { demoConstraints } from "./helpers";

const interpret = (text: string) => validateInterpretation(interpretKeywords(text, categorySpecs), categorySpecs, KEYWORD_INTERPRETER);

describe("keyword interpreter", () => {
  it("turns the Italian demo request into the demo constraints", () => {
    const result = interpret("Cerco un portatile usato per programmare, almeno 16 GB di RAM, massimo 700 € consegnato, meglio col caricatore");
    expect(result.category).toBe("laptop");
    expect(result.constraints).toEqual(expect.arrayContaining(demoConstraints));
    expect(result.constraints).toHaveLength(3);
    expect(result.textRequirements).toEqual(["Cerco un portatile usato per programmare"]);
    expect(result.notes).toEqual([]);
  });

  it("understands the same request in English", () => {
    const result = interpret("I need a laptop with at least 16GB RAM. Budget 700. A charger would be nice.");
    expect(result.constraints).toEqual(expect.arrayContaining(demoConstraints));
    expect(result.constraints).toHaveLength(3);
  });

  it("assigns each quantity to the nearest attribute word", () => {
    const result = interpret("laptop with 16 GB RAM and 1 TB SSD");
    expect(result.constraints).toEqual([
      { attribute: "ramGb", op: ">=", value: 16, hard: true },
      { attribute: "storageGb", op: ">=", value: 1000, hard: true },
    ]);
  });

  it("reads warranty in years and an explicit maximum", () => {
    expect(interpret("notebook con garanzia di almeno 1 anno").constraints).toEqual([{ attribute: "warrantyMonths", op: ">=", value: 12, hard: true }]);
    expect(interpret("notebook, RAM al massimo 32 GB").constraints).toEqual([{ attribute: "ramGb", op: "<=", value: 32, hard: true }]);
  });

  it("does not require a charger when the user says they do not need one", () => {
    expect(interpret("portatile senza caricatore va bene").constraints).toEqual([]);
  });

  it("infers the category from its attributes when it is not named", () => {
    expect(interpret("almeno 16 GB di RAM").category).toBe("laptop");
  });

  it("returns no category and no constraints for an unsupported request", () => {
    const result = interpret("Cerco una bici da corsa sotto i 500 €");
    expect(result.category).toBeNull();
    expect(result.constraints).toEqual([]);
    expect(result.textRequirements).toEqual(["Cerco una bici da corsa sotto i 500 €"]);
  });
});

describe("validateInterpretation", () => {
  const validate = (raw: unknown) => validateInterpretation(raw, categorySpecs, "test");

  it("rejects output that does not match the schema", () => {
    expect(() => validate({ category: "laptop", constraints: "16GB" })).toThrow();
  });

  it("drops constraints the category cannot evaluate, with a note for each", () => {
    const result = validate({
      category: "laptop",
      constraints: [
        { attribute: "ramGb", op: ">=", value: 16, hard: true },
        { attribute: "gpu", op: "=", value: "RTX", hard: true },
        { attribute: "ramGb", op: ">=", value: "sixteen", hard: true },
        { attribute: "chargerIncluded", op: ">=", value: 1, hard: false },
        { attribute: "total", op: "<=", value: 699.5, hard: true },
        { attribute: "ramGb", op: ">=", value: 32, hard: false },
      ],
      textRequirements: [],
    });
    expect(result.constraints).toEqual([{ attribute: "ramGb", op: ">=", value: 16, hard: true }]);
    expect(result.notes).toHaveLength(5);
    expect(result.notes[0]).toContain('"gpu" is not an attribute of Laptop');
  });

  it("drops everything for an unknown category and says which ones are supported", () => {
    const result = validate({ category: "bike", constraints: [{ attribute: "total", op: "<=", value: 50000, hard: true }], textRequirements: ["road bike"] });
    expect(result.category).toBeNull();
    expect(result.constraints).toEqual([]);
    expect(result.textRequirements).toEqual(["road bike"]);
    expect(result.notes[0]).toContain("Supported: laptop");
  });
});
