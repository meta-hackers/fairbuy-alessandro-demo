// Form state <-> contract constraints. The form is generated from the CategorySpec,
// so a new category needs a spec, not new UI code. It shows only the requirements in
// play: the ones the interpreter proposed plus the ones the user adds.
import { TOTAL_ATTRIBUTE, type CategorySpec, type Constraint } from "@fairbuy/core";

// required = hard constraint (excludes the offer), preferred = soft (affects the score).
export type Mode = "required" | "preferred";

export interface RowDef {
  key: string; // attribute key, or TOTAL_ATTRIBUTE for the budget
  label: string;
  detail?: string;
  kind: "number" | "bool";
  op: ">=" | "<=" | "="; // the comparison the row expresses
}

export interface DraftRow {
  key: string;
  mode: Mode;
  value: string; // raw input; only used by number rows (euros for the budget)
}

export interface Draft {
  rows: DraftRow[];
  // Requirements with no matching attribute: shown, never filtered on.
  textRequirements: string[];
}

export const emptyDraft: Draft = { rows: [], textRequirements: [] };

// Rows the form can express. Text and enum attributes need a value list first.
export function rowDefs(spec: CategorySpec): RowDef[] {
  const defs: RowDef[] = [{ key: TOTAL_ATTRIBUTE, label: "Budget", detail: "max delivered total, €", kind: "number", op: "<=" }];
  for (const attr of spec.attributes) {
    if (attr.type === "bool") {
      defs.push({ key: attr.key, label: attr.label, kind: "bool", op: "=" });
    } else if (attr.type === "number") {
      // A number attribute is a minimum when more is better, otherwise a maximum.
      const op = attr.better === "lower" ? "<=" : ">=";
      const bound = op === ">=" ? "at least" : "at most";
      defs.push({ key: attr.key, label: attr.label, detail: attr.unit ? `${bound}, ${attr.unit}` : bound, kind: "number", op });
    }
  }
  return defs;
}

export function toConstraints(spec: CategorySpec, draft: Draft): Constraint[] {
  const defs = new Map(rowDefs(spec).map((d) => [d.key, d]));
  const constraints: Constraint[] = [];
  for (const row of draft.rows) {
    const def = defs.get(row.key);
    if (!def) continue;
    const hard = row.mode === "required";
    if (def.kind === "bool") {
      constraints.push({ attribute: def.key, op: "=", value: true, hard });
      continue;
    }
    const value = parseAmount(row.value);
    // An empty or invalid number means "no constraint", never a silent zero.
    if (value === undefined) continue;
    constraints.push({ attribute: def.key, op: def.op, value: def.key === TOTAL_ATTRIBUTE ? Math.round(value * 100) : value, hard });
  }
  return constraints;
}

// The inverse: an interpreter proposal shown in the form. Constraints the form cannot
// show (e.g. "charger = false", a minimum budget) are returned so the UI can say so.
export function fromConstraints(spec: CategorySpec, constraints: Constraint[], textRequirements: string[]): { draft: Draft; unshown: Constraint[] } {
  const defs = new Map(rowDefs(spec).map((d) => [d.key, d]));
  const rows: DraftRow[] = [];
  const unshown: Constraint[] = [];
  for (const c of constraints) {
    const def = defs.get(c.attribute);
    const fits = def && c.op === def.op && (def.kind === "bool" ? c.value === true : typeof c.value === "number");
    if (!def || !fits || rows.some((r) => r.key === c.attribute)) {
      unshown.push(c);
      continue;
    }
    const value = def.kind === "bool" ? "" : String(c.attribute === TOTAL_ATTRIBUTE ? (c.value as number) / 100 : c.value);
    rows.push({ key: c.attribute, mode: c.hard ? "required" : "preferred", value });
  }
  // Keep the form order stable: budget first, then the spec order.
  const order = [...defs.keys()];
  rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return { draft: { rows, textRequirements }, unshown };
}

function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
