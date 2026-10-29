# @fairbuy/core

Shared data contract, category specs, synthetic fixtures, and the deterministic ranking engine. **Draft** implementation of [meta-hackers/fairbuy#1](https://github.com/meta-hackers/fairbuy/issues/1): it follows the choices proposed there and will change with the review.

## Layout

| Path | Contents |
|---|---|
| `src/contract.ts` | Zod schemas and inferred types: `Offer`, `Field<T>`, `PriceBreakdown`, `CategorySpec`, `Constraint`, `ConnectorError` |
| `src/categories/` | Category specs (configuration) and the `categorySpecs` registry. Only `laptop` for now |
| `src/interpret/` | Free-text request → proposed constraints: the `Interpretation` schema, `validateInterpretation`, and the keyword stand-in interpreter |
| `src/ranking/` | Total cost, constraint evaluation, filtering and scoring |
| `fixtures/laptop/` | Synthetic offers A/B/C from the demo (PROPOSAL §4). Not current offers |
| `test/` | Contract validation, ranking scenarios, interpretation |

## How the ranking works

1. **Total cost:** sum of price components; flagged as a lower bound when a cost is missing or unknown.
2. **Feasibility before scoring:** each hard constraint is `pass`, `fail`, or `unknown`.
   - Any `fail` (or sold out) → **excluded**, with reasons.
   - Any `unknown` (or availability not confirmed) → **unverified**: still shown, never treated as passing.
   - An incomplete total whose known minimum already exceeds the budget is a sure `fail`.
3. **Score** (feasible and unverified only), weights from PROPOSAL §7 and overridable:
   - `cost` (0.50): min–max normalized total across candidates.
   - `suitability` (0.30): share of soft constraints that pass.
   - `reliability` (0.20): how well-sourced the relevant data is (verified 1, seller claim 0.6, estimate 0.4, unknown 0; each declared missing field counts as unknown). This is data quality, not product quality.
4. **Warnings:** synthetic data, near ties (difference < 0.02), and incomplete totals that rank above other offers.

Same offers + constraints + weights + `RANKING_VERSION` → same result, independent of input order.

## How a request is interpreted

1. An interpreter proposes `{ category, constraints, textRequirements }` from the user's text. The planned one is a language model on the backend. Until model access is confirmed, `interpretKeywords` recognizes a few English and Italian phrasings (budget, RAM, storage, warranty, charger; "meglio" / "ideally" make a requirement preferred).
2. `validateInterpretation` treats that output as untrusted. It parses it with the schema and keeps only constraints the category can evaluate (known attribute, matching type and operator, whole cents for the total). Everything it drops comes back as a `note`.
3. Requirements with no matching attribute ("per programmare") stay as `textRequirements`: shown to the user, never used as filters.
4. The user reviews and edits the proposal before any comparison: the model proposes, deterministic code ranks.

## Scripts

From the repository root:

```bash
npm install
npm test
npm run typecheck
```

## Deviations from the issue

- `Constraint.value` also accepts `boolean` (needed for constraints like `chargerIncluded = true`).
- `PriceComponent` has an optional `label` (e.g. "Pickup travel").
- Workspaces use **npm** instead of pnpm, to avoid an extra tool until the monorepo question is settled.
