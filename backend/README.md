# Backend

FairBuy **NestJS API** (planned hosting: Render). Skeleton from [#4](https://github.com/meta-hackers/fairbuy/issues/4): it runs the full comparison on **synthetic fixtures** using `@fairbuy/core`. No deployment is configured yet.

## Run

From the repository root:

```bash
npm install
npm run start:backend   # http://localhost:3000
npm test
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `CORS_ORIGIN` | unset (CORS off) | Comma-separated list of allowed frontend origins |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/comparisons` | Body: `category`, `constraints` (max 50), optional `weights`. Validated with the Zod schemas from core; unknown fields are rejected. Returns `201` with the stored comparison: the request, the `offers` considered and their `ComparisonResult` |
| `POST` | `/v1/interpretations` | Body: `{ "text": "..." }` (1–2000 chars). Returns `200` with a proposed `category`, `constraints`, `textRequirements` and `notes`, validated with the core schema. Nothing is stored. `502` if the interpreter returns malformed output |
| `GET` | `/v1/comparisons/:id` | A stored comparison (`400` for a malformed id, `404` if unknown) |
| `GET` | `/health` | `{ "status": "ok" }` |

Example:

```bash
curl -X POST localhost:3000/v1/comparisons -H 'content-type: application/json' \
  -d '{"category":"laptop","constraints":[{"attribute":"ramGb","op":">=","value":16,"hard":true},{"attribute":"total","op":"<=","value":70000,"hard":true}]}'
```

## Structure

| Path | Contents |
|---|---|
| `src/connectors/` | `Connector` interface (PROPOSAL §8) and `FixtureConnector` |
| `src/interpretations/` | `Interpreter` interface and `KeywordInterpreter` (stand-in until model access, #3) |
| `src/comparisons/` | Request schema, service, controller, bounded in-memory store |
| `src/app.module.ts` | Module wiring and `configureApp` (CORS, shutdown hooks), shared with the tests |
| `test/` | e2e tests on the demo request and connector tests |

Notes:

- Runs with `tsx` (TypeScript directly, no build step). Dependencies are injected with explicit `@Inject(...)` tokens, so nothing relies on emitted decorator metadata.
- Deliberately **not** here yet: Supabase/auth/persistence, background jobs/SSE, live connectors, server-side URL fetching, model calls (the interpreter is a keyword stand-in).
- Keep provider credentials and privileged database keys in server-side environment configuration only.
