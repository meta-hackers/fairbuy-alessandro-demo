// Deterministic stand-in for the language-model interpreter: recognizes a few English
// and Italian phrasings with regular expressions. It lets the Ask step work end to end
// before model access is confirmed; its output goes through validateInterpretation
// exactly like a model's would.
import { TOTAL_ATTRIBUTE, type CategorySpec, type Constraint } from "../contract";
import type { RawInterpretation } from "./interpretation";

export const KEYWORD_INTERPRETER = "keyword";

// Words that name a category.
const CATEGORY_WORDS: Record<string, string[]> = {
  laptop: ["laptop", "notebook", "portatile", "portatili", "macbook", "ultrabook"],
};

// Words that point a clause at an attribute, by attribute key.
const ATTRIBUTE_WORDS: Record<string, string[]> = {
  ramGb: ["ram", "memoria"],
  storageGb: ["ssd", "hdd", "storage", "disco", "archiviazione", "spazio"],
  warrantyMonths: ["garanzia", "warranty"],
  chargerIncluded: ["caricatore", "charger", "alimentatore"],
};

// Number + unit, converted to the unit the spec uses.
const UNIT_FACTORS: Record<string, Record<string, number>> = {
  GB: { gb: 1, tb: 1000 },
  months: { mesi: 1, mese: 1, months: 1, month: 1, anni: 12, anno: 12, years: 12, year: 12 },
};

const PREFERENCE_WORDS = ["meglio", "preferibilmente", "possibilmente", "se possibile", "ideally", "preferably", "if possible", "nice to have", "would be nice"];
const NEGATION_WORDS = ["senza", "non serve", "without", "no need"];
const FILLER_WORDS = new Set(["cerco", "sto", "cercando", "voglio", "vorrei", "mi", "serve", "un", "una", "uno", "i", "need", "want", "am", "looking", "for", "a", "an"]);

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const MONEY = new RegExp(String.raw`(?:€\s*${NUMBER})|(?:${NUMBER}\s*(?:€|eur\b|euro\b))`, "i");
const BUDGET = new RegExp(String.raw`budget\s*(?:di\s*|of\s*)?${NUMBER}`, "i");

export function interpretKeywords(text: string, specs: Readonly<Record<string, CategorySpec>>): RawInterpretation {
  const lower = text.toLowerCase();
  const category = findCategory(lower, specs);
  const spec = category ? specs[category] : undefined;

  const constraints: Constraint[] = [];
  const textRequirements: string[] = [];

  for (const clause of splitClauses(text)) {
    const found = spec ? clauseConstraints(clause.toLowerCase(), spec) : [];
    constraints.push(...found);
    if (found.length === 0 && hasContent(clause, category)) textRequirements.push(clause);
  }
  return { category, constraints, textRequirements };
}

function findCategory(lower: string, specs: Readonly<Record<string, CategorySpec>>): string | null {
  const named = Object.keys(specs).filter((id) => (CATEGORY_WORDS[id] ?? []).some((w) => hasWord(lower, w)));
  if (named.length === 1) return named[0]!;
  if (named.length > 1) return null;
  // Not named: accept a category only if its attribute words are the only ones used.
  const implied = Object.entries(specs).filter(([, spec]) => spec.attributes.some((a) => (ATTRIBUTE_WORDS[a.key] ?? []).some((w) => hasWord(lower, w))));
  return implied.length === 1 ? implied[0]![0] : null;
}

function clauseConstraints(clause: string, spec: CategorySpec): Constraint[] {
  const hard = !PREFERENCE_WORDS.some((w) => clause.includes(w));
  const result: Constraint[] = [];

  const money = MONEY.exec(clause) ?? BUDGET.exec(clause);
  if (money) {
    const amount = parseNumber(money[1] ?? money[2]!);
    const atLeast = /\b(almeno|minimo|at least|over|oltre)\s*$/.test(before(clause, money.index));
    result.push({ attribute: TOTAL_ATTRIBUTE, op: atLeast ? ">=" : "<=", value: Math.round(amount * 100), hard });
  }

  for (const attr of spec.attributes) {
    const words = ATTRIBUTE_WORDS[attr.key] ?? [];
    const positions = words.flatMap((w) => wordPositions(clause, w));
    if (positions.length === 0) continue;

    if (attr.type === "bool") {
      // "senza caricatore" / "no need for a charger": nothing to require.
      if (!NEGATION_WORDS.some((w) => clause.includes(w))) result.push({ attribute: attr.key, op: "=", value: true, hard });
    } else if (attr.type === "number" && attr.unit) {
      const quantity = nearestQuantity(clause, UNIT_FACTORS[attr.unit] ?? {}, positions);
      if (!quantity) continue;
      const atMost = /\b(massimo|al massimo|at most|max|fino a|up to)\s*$/.test(before(clause, quantity.index));
      const op = atMost || attr.better === "lower" ? "<=" : ">=";
      result.push({ attribute: attr.key, op, value: quantity.value, hard });
    }
  }
  return result;
}

// The quantity closest to the attribute word: in "16 GB RAM and 512 GB SSD" RAM is 16.
function nearestQuantity(clause: string, factors: Record<string, number>, positions: number[]): { value: number; index: number } | undefined {
  const units = Object.keys(factors).join("|");
  if (!units) return undefined;
  let best: { value: number; index: number; distance: number } | undefined;
  for (const match of clause.matchAll(new RegExp(String.raw`${NUMBER}\s*(${units})\b`, "g"))) {
    const distance = Math.min(...positions.map((p) => Math.abs(p - match.index)));
    if (!best || distance < best.distance) {
      best = { value: parseNumber(match[1]!) * factors[match[2]!]!, index: match.index, distance };
    }
  }
  return best;
}

// The few words right before a match, where qualifiers such as "almeno" or "max" sit.
function before(clause: string, index: number): string {
  return clause.slice(Math.max(0, index - 20), index);
}

// Clauses: sentence breaks, commas, semicolons, and "but"/"ma".
function splitClauses(text: string): string[] {
  return text
    .split(/[\n;,]|\.\s|\.$|\s+(?:ma|but)\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

// A clause is worth keeping as text if something remains once filler and the
// category name are removed.
function hasContent(clause: string, category: string | null): boolean {
  const categoryWords = new Set(category ? CATEGORY_WORDS[category] : []);
  const words = clause.toLowerCase().match(/[\p{L}\d]+/gu) ?? [];
  return words.filter((w) => !FILLER_WORDS.has(w) && !categoryWords.has(w)).length >= 2;
}

function hasWord(text: string, word: string): boolean {
  return wordPositions(text, word).length > 0;
}

function wordPositions(text: string, word: string): number[] {
  return [...text.matchAll(new RegExp(String.raw`(?<![\p{L}])${word}(?![\p{L}])`, "gu"))].map((m) => m.index);
}

function parseNumber(raw: string): number {
  return Number(raw.replace(",", "."));
}
