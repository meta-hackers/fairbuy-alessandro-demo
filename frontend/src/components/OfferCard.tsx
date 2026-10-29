import type { CategorySpec, Offer, RankedOffer } from "@fairbuy/core";
import { componentLabel, formatAttr, formatCents, formatTotal, outcomeLabel, percent, statusLabel } from "../format";

interface Props {
  offer: Offer | undefined;
  ranked: RankedOffer;
  spec: CategorySpec;
}

const SCORE_PARTS = [
  { key: "cost", label: "Cost" },
  { key: "suitability", label: "Fit" },
  { key: "reliability", label: "Data" },
] as const;

export function OfferCard({ offer, ranked, spec }: Props) {
  const title = offer?.title ?? ranked.offerId;
  return (
    <article className={`panel offer ${ranked.status}`} aria-label={`Rank ${ranked.rank}: ${title}`}>
      <header className="offer-head">
        <span className="rank">#{ranked.rank}</span>
        <div className="offer-title">
          <h3>{title}</h3>
          {offer && (
            <p className="muted">
              {offer.condition.status === "unknown" ? "condition unknown" : `${offer.condition.value} (${statusLabel[offer.condition.status]})`}
            </p>
          )}
        </div>
        <span className={`badge ${ranked.status}`}>{ranked.status === "feasible" ? "Feasible" : "Needs checking"}</span>
      </header>

      <div className="offer-numbers">
        <div>
          <span className="muted">Delivered total</span>
          <strong className="total">{formatTotal(ranked.total)}</strong>
        </div>
        <div>
          <span className="muted">Score</span>
          <strong className="total">{ranked.score.toFixed(2)}</strong>
        </div>
      </div>

      <div className="score-bar" role="img" aria-label={scoreSummary(ranked)}>
        {SCORE_PARTS.map(({ key }) => (
          <span key={key} className={`part ${key}`} style={{ width: percent(ranked.breakdown[key].contribution) }} />
        ))}
      </div>
      <p className="legend">
        {SCORE_PARTS.map(({ key, label }) => (
          <span key={key}>
            <i className={`dot ${key}`} /> {label} {percent(ranked.breakdown[key].value)} × {ranked.breakdown[key].weight}
          </span>
        ))}
      </p>

      <details open={ranked.rank === 1}>
        <summary>Why this result</summary>
        <h4>Requirements</h4>
        <ul className="checks">
          {ranked.constraints.length === 0 && <li className="muted">No requirements set.</li>}
          {ranked.constraints.map((c, i) => (
            <li key={i} className={c.outcome}>
              <span className="outcome">{outcomeLabel[c.outcome]}</span> {c.reason}
              {!c.constraint.hard && <span className="muted"> (preferred)</span>}
            </li>
          ))}
        </ul>

        {offer && (
          <>
            <h4>Price</h4>
            <table className="price">
              <tbody>
                {offer.price.components.map((c, i) => (
                  <tr key={i}>
                    <td>{componentLabel(c)}</td>
                    <td className="muted">{statusLabel[c.status]}</td>
                    <td className="amount">{formatCents(c.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ranked.total.isLowerBound && <p className="note">Some costs are not known yet: the real total can only be higher.</p>}

            <h4>Specs</h4>
            <ul className="specs">
              {spec.attributes.map((attr) => {
                const field = offer.attributes[attr.key];
                return (
                  <li key={attr.key}>
                    <span>{attr.label}</span>
                    {!field || field.status === "unknown" ? (
                      <span className="muted">not stated</span>
                    ) : (
                      <span>
                        {formatAttr(field.value)} <span className="muted">({statusLabel[field.status]})</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {offer.missing.length > 0 && <p className="note">Missing data: {offer.missing.join(", ")}.</p>}
            <p className="muted small">
              Source: {offer.provenanceUrl} · fetched {offer.fetchedAt.slice(0, 10)}
            </p>
          </>
        )}
      </details>
    </article>
  );
}

function scoreSummary(r: RankedOffer): string {
  return SCORE_PARTS.map(({ key, label }) => `${label} ${r.breakdown[key].contribution}`).join(", ");
}
