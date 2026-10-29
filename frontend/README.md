# Frontend

FairBuy **web app** (React + Vite). The requirements form, the explainable ranking, and the excluded offers with their reasons. It runs the same comparison either on the backend API or on `@fairbuy/core` directly in the browser.

## Run

From the repository root:

```bash
npm install
npm run dev:frontend      # http://localhost:5173, local engine
npm run start:backend     # optional, in a second terminal: enables "Backend API"
npm test
npm run build             # static files in frontend/dist
```

In development, Vite proxies `/v1` and `/health` to `http://localhost:3000`, so the backend needs no CORS setup.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_DATA_SOURCE` | `local` | Source selected on load: `local` or `backend` |
| `VITE_API_URL` | empty (same origin) | Backend base URL for builds served elsewhere, e.g. GitHub Pages. That backend must list the page origin in `CORS_ORIGIN` |

## Data sources

| Source | What it does |
|---|---|
| Local engine | Ranks the synthetic fixtures with `rankOffers` in the browser. Needs no server, so a static build works on its own |
| Backend API | `POST /v1/comparisons`. The response includes the offers, validated with the core `OfferSchema` before display |

Both return the same `ComparisonView`, so the UI does not depend on the source.

## Structure

| Path | Contents |
|---|---|
| `src/request.ts` | Form state → contract constraints. The form is generated from the `CategorySpec`: number attributes become a minimum or maximum, booleans a must-have |
| `src/dataSource.ts` | Local and backend sources |
| `src/components/` | Form, ranked offer card (score breakdown, requirement checks, price components, specs with their status), results |
| `test/` | Constraint mapping, both sources (mocked `fetch`), and the app on the demo request |

Notes:

- Required = hard constraint (excludes the offer), Preferred = soft (affects the score only).
- An incomplete total is shown as "from €…", never as the price.
- Text and enum attributes (e.g. CPU) are not in the form yet: they need a list of allowed values first.
- No provider keys or credentials belong in the frontend.
