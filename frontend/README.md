# Frontend

FairBuy **web app** (React + Vite), in three steps:

1. **Describe** what you need in your own words.
2. **Check the requirements** proposed from that text: edit, remove or add them, set each to Required or Preferred.
3. **Compare**: the explainable ranking, and the excluded offers with their reasons.

Interpretation and comparison run either on the backend API or on `@fairbuy/core` directly in the browser.

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
| Local engine | Keyword interpreter and `rankOffers` on the synthetic fixtures, in the browser. Needs no server, so a static build works on its own |
| Backend API | `POST /v1/interpretations`, then `POST /v1/comparisons`. Responses are validated with the core schemas before display |

Both return the same shapes, so the UI does not depend on the source.

## Structure

| Path | Contents |
|---|---|
| `src/request.ts` | Form rows ↔ contract constraints. Rows come from the `CategorySpec`: number attributes become a minimum or maximum, booleans a must-have. Only the rows in play are shown |
| `src/dataSource.ts` | Local and backend sources |
| `src/components/` | Request box, requirements form, ranked offer card (score breakdown, requirement checks, price components, specs with their status), results |
| `test/` | Row ↔ constraint mapping, both sources (mocked `fetch`), and the full flow on the example request |

Notes:

- Required = hard constraint (excludes the offer), Preferred = soft (affects the score only).
- An incomplete total is shown as "from €…", never as the price.
- Text and enum attributes (e.g. CPU) are not in the form yet: they need a list of allowed values first.
- Requirements the interpreter could not map to an attribute are listed as "not checked automatically" and never filter offers.
- New requirements clear the previous results: nothing is compared until the user presses Compare.
- No provider keys or credentials belong in the frontend.
