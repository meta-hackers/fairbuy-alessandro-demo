import type { FormEvent } from "react";
import type { AttributeDef, CategorySpec } from "@fairbuy/core";
import type { SourceId } from "../dataSource";
import { formAttributes, numberOp, type Draft, type DraftField, type Mode } from "../request";

interface Props {
  spec: CategorySpec;
  draft: Draft;
  onDraftChange(draft: Draft): void;
  sourceId: SourceId;
  onSourceChange(id: SourceId): void;
  onSubmit(): void;
  busy: boolean;
}

export function RequestForm({ spec, draft, onDraftChange, sourceId, onSourceChange, onSubmit, busy }: Props) {
  const setField = (key: string, field: DraftField) => onDraftChange({ ...draft, fields: { ...draft.fields, [key]: field } });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="panel request" onSubmit={submit} aria-label="Requirements">
      <h2>What do you need?</h2>
      <p className="hint">
        <strong>Required</strong> excludes offers that fail. <strong>Preferred</strong> only affects the score.
      </p>

      <Row
        id="budget"
        label="Budget"
        detail="max delivered total, €"
        field={draft.budget}
        numeric
        onChange={(budget) => onDraftChange({ ...draft, budget })}
      />
      {formAttributes(spec).map((attr) => (
        <Row
          key={attr.key}
          id={attr.key}
          label={attr.label}
          detail={detailFor(attr)}
          field={draft.fields[attr.key] ?? { mode: "off", value: "" }}
          numeric={attr.type === "number"}
          onChange={(field) => setField(attr.key, field)}
        />
      ))}

      <fieldset className="source">
        <legend>Data source</legend>
        <label>
          <input type="radio" name="source" value="local" checked={sourceId === "local"} onChange={() => onSourceChange("local")} />
          Local engine <span className="muted">(in the browser)</span>
        </label>
        <label>
          <input type="radio" name="source" value="backend" checked={sourceId === "backend"} onChange={() => onSourceChange("backend")} />
          Backend API
        </label>
      </fieldset>

      <button type="submit" disabled={busy}>
        {busy ? "Comparing…" : "Compare offers"}
      </button>
    </form>
  );
}

function detailFor(attr: AttributeDef): string | undefined {
  if (attr.type !== "number") return undefined;
  const bound = numberOp(attr) === ">=" ? "at least" : "at most";
  return attr.unit ? `${bound}, ${attr.unit}` : bound;
}

interface RowProps {
  id: string;
  label: string;
  detail?: string;
  field: DraftField;
  numeric: boolean;
  onChange(field: DraftField): void;
}

function Row({ id, label, detail, field, numeric, onChange }: RowProps) {
  return (
    <div className="row">
      <label className="row-label" htmlFor={`mode-${id}`}>
        {label}
        {detail && <span className="muted"> ({detail})</span>}
      </label>
      {numeric && (
        <input
          className="row-value"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          aria-label={`${label} value`}
          value={field.value}
          disabled={field.mode === "off"}
          onChange={(e) => onChange({ ...field, value: e.target.value })}
        />
      )}
      <select id={`mode-${id}`} value={field.mode} onChange={(e) => onChange({ ...field, mode: e.target.value as Mode })}>
        <option value="off">Ignore</option>
        <option value="required">Required</option>
        <option value="preferred">Preferred</option>
      </select>
    </div>
  );
}
