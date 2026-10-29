import { useCallback, useRef, useState } from "react";
import { categorySpecs, laptopSpec, type CategorySpec, type Interpretation } from "@fairbuy/core";
import { AskPanel } from "./components/AskPanel";
import { RequestForm } from "./components/RequestForm";
import { Results } from "./components/Results";
import { defaultSourceId, sourceFor, type ComparisonView, type DataSource, type SourceId } from "./dataSource";
import { emptyDraft, fromConstraints, toConstraints, type Draft } from "./request";

// Until a request names one, the form starts on the only category with data.
const DEFAULT_SPEC = laptopSpec;

interface Props {
  initialSource?: SourceId;
  // Tests inject a source; the app picks one from the selected id.
  resolveSource?: (id: SourceId) => DataSource;
}

export function App({ initialSource = defaultSourceId, resolveSource = sourceFor }: Props) {
  const [text, setText] = useState("");
  const [spec, setSpec] = useState<CategorySpec>(DEFAULT_SPEC);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [proposal, setProposal] = useState<{ interpreter: string; notes: string[] }>();
  const [sourceId, setSourceId] = useState<SourceId>(initialSource);
  const [view, setView] = useState<ComparisonView>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<"interpret" | "compare">();
  // Only the latest request may update the screen; older responses are dropped.
  const latest = useRef(0);

  const run = useCallback(async <T,>(kind: "interpret" | "compare", task: () => Promise<T>, apply: (value: T) => void) => {
    const request = ++latest.current;
    setBusy(kind);
    setError(undefined);
    try {
      const value = await task();
      if (request === latest.current) apply(value);
    } catch (e) {
      if (request === latest.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (request === latest.current) setBusy(undefined);
    }
  }, []);

  const interpret = () =>
    run("interpret", () => resolveSource(sourceId).interpret(text), (result: Interpretation) => {
      const nextSpec = (result.category && categorySpecs[result.category]) || DEFAULT_SPEC;
      const { draft: next, unshown } = fromConstraints(nextSpec, result.constraints, result.textRequirements);
      const notes = [...result.notes, ...unshown.map((c) => `Not shown in the form: ${c.attribute} ${c.op} ${JSON.stringify(c.value)}.`)];
      if (!result.category) notes.unshift(`No supported category recognized; showing ${DEFAULT_SPEC.label}.`);
      setSpec(nextSpec);
      setDraft(next);
      setProposal({ interpreter: result.interpreter, notes });
      // New requirements, old results: clear them until the user confirms and compares.
      setView(undefined);
    });

  const compare = (id: SourceId) => run("compare", () => resolveSource(id).compare(spec, toConstraints(spec, draft)), setView);

  // Switching source re-runs the comparison on screen, if there is one.
  const switchSource = (id: SourceId) => {
    setSourceId(id);
    if (view) void compare(id);
  };

  return (
    <div className="app">
      <header className="top">
        <h1>FairBuy</h1>
        <p>Say what you need. FairBuy turns it into requirements you can check, then ranks offers by delivered total, fit and how well the data is sourced.</p>
      </header>
      <AskPanel text={text} onTextChange={setText} onSubmit={() => void interpret()} busy={busy === "interpret"} sourceId={sourceId} onSourceChange={switchSource} />
      <main className="layout">
        <RequestForm spec={spec} draft={draft} onDraftChange={setDraft} proposal={proposal} onSubmit={() => void compare(sourceId)} busy={busy === "compare"} />
        <div>
          {error && (
            <p className="panel error" role="alert">
              {error}
            </p>
          )}
          {view ? (
            <Results view={view} spec={spec} />
          ) : (
            !error && (
              <p className="panel muted placeholder">
                <span className="step">3</span> Results appear here once you compare.
              </p>
            )
          )}
        </div>
      </main>
      <footer className="muted small">Synthetic demo data. FairBuy never buys, books or contacts sellers.</footer>
    </div>
  );
}
