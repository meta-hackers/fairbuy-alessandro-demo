import type { CategorySpec } from "@fairbuy/core";
import type { ComparisonView } from "../dataSource";
import { OfferCard } from "./OfferCard";

interface Props {
  view: ComparisonView;
  spec: CategorySpec;
}

export function Results({ view, spec }: Props) {
  const { result, offers } = view;
  const offersById = new Map(offers.map((o) => [o.id, o]));

  return (
    <section className="results" aria-label="Results">
      {result.warnings.length > 0 && (
        <ul className="warnings" role="note">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <h2>
        Ranked offers <span className="muted">({result.ranked.length})</span>
      </h2>
      {result.ranked.length === 0 && <p className="panel muted">No offer meets the required constraints.</p>}
      {result.ranked.map((r) => (
        <OfferCard key={r.offerId} offer={offersById.get(r.offerId)} ranked={r} spec={spec} />
      ))}

      {result.excluded.length > 0 && (
        <>
          <h2>
            Excluded <span className="muted">({result.excluded.length})</span>
          </h2>
          <ul className="panel excluded">
            {result.excluded.map((e) => (
              <li key={e.offerId}>
                <strong>{offersById.get(e.offerId)?.title ?? e.offerId}</strong>
                <span className="muted"> — {e.reasons.join("; ")}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="muted small">
        Ranking {result.rankingVersion} · {view.source === "backend" ? "backend API" : "local engine"}
      </p>
    </section>
  );
}
