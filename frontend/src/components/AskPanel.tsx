import type { FormEvent } from "react";
import { MAX_REQUEST_LENGTH } from "@fairbuy/core";
import type { SourceId } from "../dataSource";

export const EXAMPLE_REQUEST =
  "Cerco un portatile usato per programmare, almeno 16 GB di RAM, massimo 700 € consegnato, meglio col caricatore";

interface Props {
  text: string;
  onTextChange(text: string): void;
  onSubmit(): void;
  busy: boolean;
  sourceId: SourceId;
  onSourceChange(id: SourceId): void;
}

export function AskPanel({ text, onTextChange, onSubmit, busy, sourceId, onSourceChange }: Props) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) onSubmit();
  };

  return (
    <form className="panel ask" onSubmit={submit} aria-label="Request">
      <h2>
        <span className="step">1</span> Describe what you need
      </h2>
      <textarea
        aria-label="What are you looking for?"
        placeholder={`e.g. "${EXAMPLE_REQUEST}"`}
        value={text}
        maxLength={MAX_REQUEST_LENGTH}
        rows={3}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter adds a line.
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
      />
      <div className="ask-actions">
        <button type="button" className="link" onClick={() => onTextChange(EXAMPLE_REQUEST)}>
          Use the example
        </button>
        <fieldset className="source">
          <legend className="visually-hidden">Data source</legend>
          <label>
            <input type="radio" name="source" value="local" checked={sourceId === "local"} onChange={() => onSourceChange("local")} />
            Local engine
          </label>
          <label>
            <input type="radio" name="source" value="backend" checked={sourceId === "backend"} onChange={() => onSourceChange("backend")} />
            Backend API
          </label>
        </fieldset>
        <button type="submit" className="primary" disabled={busy || !text.trim()}>
          {busy ? "Reading…" : "Read my request"}
        </button>
      </div>
    </form>
  );
}
