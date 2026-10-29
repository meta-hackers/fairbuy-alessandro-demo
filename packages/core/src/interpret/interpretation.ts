// From a free-text request to structured constraints. Interpreters (a language model,
// or the keyword stand-in) propose; this module decides what is accepted.
import { z } from "zod";
import { ConstraintSchema, TOTAL_ATTRIBUTE, type CategorySpec, type Constraint } from "../contract";

export const MAX_REQUEST_LENGTH = 2000;

export const InterpretRequestSchema = z.strictObject({
  text: z.string().trim().min(1).max(MAX_REQUEST_LENGTH),
});
export type InterpretRequest = z.infer<typeof InterpretRequestSchema>;

// What an interpreter must return. Model output is untrusted: it is parsed with this
// schema and then checked against the category spec by validateInterpretation.
export const RawInterpretationSchema = z.object({
  category: z.string().nullable(),
  constraints: z.array(ConstraintSchema).max(50),
  // Requirements with no matching attribute ("for programming"): kept as text,
  // never turned into a filter, never reported as checked.
  textRequirements: z.array(z.string().max(500)).max(20),
});
export type RawInterpretation = z.infer<typeof RawInterpretationSchema>;

// The validated proposal returned to clients.
export const InterpretationSchema = RawInterpretationSchema.extend({
  interpreter: z.string(),
  // What was not accepted from the interpreter, and why. Shown to the user.
  notes: z.array(z.string()),
});
export type Interpretation = z.infer<typeof InterpretationSchema>;

// Throws if the output does not have the expected shape; otherwise keeps only the
// constraints the category can evaluate and explains what was dropped.
export function validateInterpretation(raw: unknown, specs: Readonly<Record<string, CategorySpec>>, interpreter: string): Interpretation {
  const parsed = RawInterpretationSchema.parse(raw);
  const notes: string[] = [];

  const spec = parsed.category === null ? undefined : specs[parsed.category];
  if (parsed.category !== null && !spec) {
    notes.push(`Category "${parsed.category}" is not supported yet. Supported: ${Object.keys(specs).join(", ")}.`);
  }

  const constraints: Constraint[] = [];
  const seen = new Set<string>();
  for (const c of parsed.constraints) {
    const problem = spec ? checkConstraint(c, spec) : "no supported category";
    if (problem) {
      notes.push(`Ignored "${c.attribute} ${c.op} ${JSON.stringify(c.value)}": ${problem}.`);
      continue;
    }
    // One constraint per attribute and direction: the form can show it unambiguously.
    const key = `${c.attribute} ${c.op}`;
    if (seen.has(key)) {
      notes.push(`Ignored a second "${key}" constraint.`);
      continue;
    }
    seen.add(key);
    constraints.push(c);
  }

  return { interpreter, category: spec ? parsed.category : null, constraints, textRequirements: parsed.textRequirements, notes };
}

function checkConstraint(c: Constraint, spec: CategorySpec): string | undefined {
  if (c.attribute === TOTAL_ATTRIBUTE) {
    if (c.op !== "<=" && c.op !== ">=") return "a total needs <= or >=";
    if (typeof c.value !== "number" || !Number.isInteger(c.value) || c.value < 0) return "a total must be whole, non-negative cents";
    return undefined;
  }
  const attr = spec.attributes.find((a) => a.key === c.attribute);
  if (!attr) return `"${c.attribute}" is not an attribute of ${spec.label}`;
  switch (attr.type) {
    case "number":
      if (typeof c.value !== "number" || !Number.isFinite(c.value) || c.value < 0) return "expected a non-negative number";
      if (c.op === "in") return "a number needs >=, <= or =";
      return undefined;
    case "bool":
      if (typeof c.value !== "boolean" || c.op !== "=") return "expected = true or = false";
      return undefined;
    default:
      if (c.op === "in" ? !Array.isArray(c.value) : typeof c.value !== "string") return "expected text";
      return undefined;
  }
}
