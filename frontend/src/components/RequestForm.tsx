import type { FormEvent } from "react";
import type { CategorySpec } from "@fairbuy/core";
import { rowDefs, type Draft, type DraftRow, type Mode, type RowDef } from "../request";

interface Props {
  spec: CategorySpec;
  draft: Draft;
  onDraftChange(draft: Draft): void;
  // Shown after an interpretation: who proposed the rows and what was left out.
  proposal?: { interpreter: string; notes: string[] };
  onSubmit(): void;
  busy: boolean;
}

export function RequestForm({ spec, draft, onDraftChange, proposal, onSubmit, busy }: Props) {
  const defs = rowDefs(spec);
  const available = defs.filter((d) => !draft.rows.some((r) => r.key === d.key));

  const setRow = (index: number, row: DraftRow) => onDraftChange({ ...draft, rows: draft.rows.map((r, i) => (i === index ? row : r)) });
  const removeRow = (index: number) => onDraftChange({ ...draft, rows: draft.rows.filter((_, i) => i !== index) });
  const addRow = (key: string) => onDraftChange({ ...draft, rows: [...draft.rows, { key, mode: "required", value: "" }] });
  const removeText = (index: number) =>
    onDraftChange({ ...draft, textRequirements: draft.textRequirements.filter((_, i) => i !== index) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="panel request" onSubmit={submit} aria-label="Requirements">
      <h2>
        <span className="step">2</span> Check the requirements
      </h2>
      <p className="hint">
        {proposal ? `Proposed from your request (${proposal.interpreter} interpreter). ` : ""}
        <strong>Required</strong> excludes offers that fail, <strong>Preferred</strong> only affects the score.
      </p>
      <p className="category">
        Category: <strong>{spec.label}</strong>
      </p>

      {draft.rows.length === 0 && <p className="muted small">No requirements yet: describe what you need above, or add one.</p>}
      {draft.rows.map((row, i) => {
        const def = defs.find((d) => d.key === row.key);
        return def ? <Row key={row.key} def={def} row={row} onChange={(r) => setRow(i, r)} onRemove={() => removeRow(i)} /> : null;
      })}

      {available.length > 0 && (
        <select
          className="add"
          aria-label="Add requirement"
          value=""
          onChange={(e) => {
            if (e.target.value) addRow(e.target.value);
          }}
        >
          <option value="">+ Add requirement</option>
          {available.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      {draft.textRequirements.length > 0 && (
        <div className="text-reqs">
          <h4>Also mentioned, not checked automatically</h4>
          <ul>
            {draft.textRequirements.map((t, i) => (
              <li key={`${i}-${t}`}>
                <span>{t}</span>
                <button type="button" className="icon" aria-label={`Remove "${t}"`} onClick={() => removeText(i)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposal && proposal.notes.length > 0 && (
        <ul className="notes" aria-label="Interpreter notes">
          {proposal.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Comparing…" : "Compare offers"}
      </button>
    </form>
  );
}

interface RowProps {
  def: RowDef;
  row: DraftRow;
  onChange(row: DraftRow): void;
  onRemove(): void;
}

function Row({ def, row, onChange, onRemove }: RowProps) {
  const id = `mode-${def.key}`;
  return (
    <div className="row">
      <label className="row-label" htmlFor={id}>
        {def.label}
        {def.detail && <span className="muted"> ({def.detail})</span>}
      </label>
      {def.kind === "number" && (
        <input
          className="row-value"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          aria-label={`${def.label} value`}
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
        />
      )}
      <select id={id} value={row.mode} onChange={(e) => onChange({ ...row, mode: e.target.value as Mode })}>
        <option value="required">Required</option>
        <option value="preferred">Preferred</option>
      </select>
      <button type="button" className="icon" aria-label={`Remove ${def.label}`} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}
