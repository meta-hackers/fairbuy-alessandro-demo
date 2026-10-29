import { useCallback, useEffect, useRef, useState } from "react";
import { laptopSpec } from "@fairbuy/core";
import { Results } from "./components/Results";
import { RequestForm } from "./components/RequestForm";
import { defaultSourceId, sourceFor, type ComparisonView, type DataSource, type SourceId } from "./dataSource";
import { laptopDemoDraft, toConstraints, type Draft } from "./request";

const spec = laptopSpec;

interface Props {
  initialSource?: SourceId;
  // Tests inject a source; the app picks one from the selected id.
  resolveSource?: (id: SourceId) => DataSource;
}

export function App({ initialSource = defaultSourceId, resolveSource = sourceFor }: Props) {
  const [draft, setDraft] = useState<Draft>(() => laptopDemoDraft(spec));
  const [sourceId, setSourceId] = useState<SourceId>(initialSource);
  const [view, setView] = useState<ComparisonView>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  // Only the latest request may update the screen; older responses are dropped.
  const latest = useRef(0);

  const compare = useCallback(
    async (d: Draft, id: SourceId) => {
      const request = ++latest.current;
      setBusy(true);
      setError(undefined);
      try {
        const next = await resolveSource(id).compare(spec, toConstraints(spec, d));
        if (request === latest.current) setView(next);
      } catch (e) {
        if (request === latest.current) {
          setView(undefined);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (request === latest.current) setBusy(false);
      }
    },
    [resolveSource],
  );

  // Compare on load and whenever the data source changes; form edits wait for "Compare".
  useEffect(() => {
    void compare(draft, sourceId);
  }, [sourceId, compare]);

  return (
    <div className="app">
      <header className="top">
        <h1>FairBuy</h1>
        <p>Compare {spec.label.toLowerCase()} offers by delivered total, fit and how well the data is sourced.</p>
      </header>
      <main className="layout">
        <RequestForm
          spec={spec}
          draft={draft}
          onDraftChange={setDraft}
          sourceId={sourceId}
          onSourceChange={setSourceId}
          onSubmit={() => void compare(draft, sourceId)}
          busy={busy}
        />
        <div>
          {error && (
            <p className="panel error" role="alert">
              {error}
            </p>
          )}
          {view && <Results view={view} spec={spec} />}
        </div>
      </main>
      <footer className="muted small">Synthetic demo data. FairBuy never buys, books or contacts sellers.</footer>
    </div>
  );
}
