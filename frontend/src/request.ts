// Turns the form state into contract constraints. The form is generated from the
// CategorySpec, so a new category needs a spec, not new UI code.
import { TOTAL_ATTRIBUTE, type AttributeDef, type CategorySpec, type Constraint } from "@fairbuy/core";

// required = hard constraint (excludes the offer), preferred = soft (affects the score).
export type Mode = "off" | "required" | "preferred";

export interface DraftField {
  mode: Mode;
  value: string; // raw input; only used by numeric attributes
}

export interface Draft {
  budget: DraftField; // maximum delivered total, in euros
  fields: Record<string, DraftField>;
}

// Attributes the form can express. Text and enum attributes need a value list first.
export function formAttributes(spec: CategorySpec): AttributeDef[] {
  return spec.attributes.filter((a) => a.type === "number" || a.type === "bool");
}

// A number attribute is a minimum when more is better, otherwise a maximum.
export function numberOp(attr: AttributeDef): ">=" | "<=" {
  return attr.better === "lower" ? "<=" : ">=";
}

export function emptyDraft(spec: CategorySpec): Draft {
  const fields: Record<string, DraftField> = {};
  for (const attr of formAttributes(spec)) fields[attr.key] = { mode: "off", value: "" };
  return { budget: { mode: "off", value: "" }, fields };
}

// The demo request (PROPOSAL §4): at least 16 GB RAM, max €700 delivered, charger preferred.
export function laptopDemoDraft(spec: CategorySpec): Draft {
  const draft = emptyDraft(spec);
  draft.budget = { mode: "required", value: "700" };
  draft.fields.ramGb = { mode: "required", value: "16" };
  draft.fields.chargerIncluded = { mode: "preferred", value: "" };
  return draft;
}

export function toConstraints(spec: CategorySpec, draft: Draft): Constraint[] {
  const constraints: Constraint[] = [];

  const budget = parseAmount(draft.budget.value);
  if (draft.budget.mode !== "off" && budget !== undefined) {
    constraints.push({ attribute: TOTAL_ATTRIBUTE, op: "<=", value: Math.round(budget * 100), hard: draft.budget.mode === "required" });
  }

  for (const attr of formAttributes(spec)) {
    const field = draft.fields[attr.key];
    if (!field || field.mode === "off") continue;
    const hard = field.mode === "required";
    if (attr.type === "bool") {
      constraints.push({ attribute: attr.key, op: "=", value: true, hard });
      continue;
    }
    const value = parseAmount(field.value);
    // An empty or invalid number means "no constraint", never a silent zero.
    if (value !== undefined) constraints.push({ attribute: attr.key, op: numberOp(attr), value, hard });
  }
  return constraints;
}

function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
