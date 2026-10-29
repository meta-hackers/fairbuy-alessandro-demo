// Where comparisons come from: the backend API, or the same core engine run in the browser.
// Both return the same shape, so the UI does not know which one it is talking to.
import { fixturesByCategory, OfferSchema, rankOffers, type CategorySpec, type ComparisonResult, type Constraint, type Offer } from "@fairbuy/core";

export type SourceId = "local" | "backend";

export interface ComparisonView {
  source: SourceId;
  offers: Offer[];
  result: ComparisonResult;
}

export interface DataSource {
  id: SourceId;
  compare(spec: CategorySpec, constraints: Constraint[]): Promise<ComparisonView>;
}

// Synthetic fixtures ranked in the browser: works with no server (e.g. on GitHub Pages).
export const localSource: DataSource = {
  id: "local",
  async compare(spec, constraints) {
    const offers = (fixturesByCategory[spec.id] ?? []).map((o) => structuredClone(o));
    return { source: "local", offers, result: rankOffers({ offers, constraints, spec }) };
  },
};

// baseUrl "" means same origin: in development Vite proxies /v1 to the backend.
export function backendSource(baseUrl: string, fetchImpl: typeof fetch = fetch): DataSource {
  const url = `${baseUrl.replace(/\/+$/, "")}/v1/comparisons`;
  return {
    id: "backend",
    async compare(spec, constraints) {
      let res: Response;
      try {
        res = await fetchImpl(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ category: spec.id, constraints }),
        });
      } catch {
        throw new Error(`Backend not reachable at ${url}. Start it with "npm run start:backend" or switch to the local engine.`);
      }
      const body: unknown = await res.json().catch(() => undefined);
      if (!res.ok) {
        throw new Error(messageOf(body) ?? `Backend responded with HTTP ${res.status}.`);
      }
      return parseComparison(body);
    },
  };
}

function parseComparison(body: unknown): ComparisonView {
  const { offers, result } = (body ?? {}) as { offers?: unknown; result?: ComparisonResult };
  if (!Array.isArray(offers) || !result || !Array.isArray(result.ranked) || !Array.isArray(result.excluded)) {
    throw new Error("Unexpected response from the backend.");
  }
  // Offers are validated against the shared contract, like any other external input.
  return { source: "backend", offers: offers.map((o) => OfferSchema.parse(o)), result };
}

function messageOf(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | undefined)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(" ");
  return undefined;
}

export function sourceFor(id: SourceId): DataSource {
  return id === "backend" ? backendSource(import.meta.env.VITE_API_URL ?? "") : localSource;
}

export const defaultSourceId: SourceId = import.meta.env.VITE_DATA_SOURCE === "backend" ? "backend" : "local";
