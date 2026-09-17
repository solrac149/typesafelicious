import { useEffect, useState } from "react";
import type { ChoiceSignal, SignalResult, SignalSnapshot } from "./types";
import { probabilityChanges } from "./analysis";
import { signalQuestions } from "./questions";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

function Changes({ title, current, baseline }: {
  title: string; current: ChoiceSignal; baseline: ChoiceSignal;
}) {
  return <section className="inspector-section">
    <h2>{title} changes</h2>
    <table>
      <thead><tr><th>Label</th><th>Baseline</th><th>Current</th><th>Δ pp</th></tr></thead>
      <tbody>{probabilityChanges(current.probabilities, baseline.probabilities).map((row) =>
        <tr key={row.label}><th scope="row">{row.label}</th><td>{percent(row.before)}</td>
          <td>{percent(row.after)}</td><td>{signed(row.delta)}</td></tr>
      )}</tbody>
    </table>
  </section>;
}

function Distribution({ title, signal }: { title: string; signal: ChoiceSignal }) {
  return (
    <section className="inspector-section">
      <h2>{title}</h2>
      <p>Selected: <strong>{signal.choice}</strong> · Confidence: {signal.confidence}</p>
      <table>
        <thead><tr><th scope="col">Label</th><th scope="col">Probability (0–1)</th></tr></thead>
        <tbody>
          {Object.entries(signal.probabilities).sort((a, b) => b[1] - a[1]).map(([label, probability]) => (
            <tr key={label} className={label === signal.choice ? "inspector-selected" : undefined}>
              <th scope="row">{label}{label === signal.choice ? " *" : ""}</th>
              <td>{probability}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function SignalInspector({ result, state, open, onToggle, resultText, baseline, fresh, onFreeze, onClearBaseline }: {
  result: SignalResult | null;
  state: "idle" | "reading" | "resolved" | "error";
  open: boolean;
  onToggle: () => void;
  resultText: string;
  baseline: SignalSnapshot | null;
  fresh: boolean;
  onFreeze: () => void;
  onClearBaseline: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const json = result ? JSON.stringify(result, null, 2) : "";

  useEffect(() => { setCopyStatus(""); }, [result]);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable. Select and copy the JSON below.");
    }
  }

  return (
    <section className="signal-inspector" aria-label="Signal inspector">
      <button className="inspector-toggle" type="button" aria-expanded={open}
        aria-controls="signal-inspector-content" onClick={onToggle}>
        <span>SIGNAL INSPECTOR</span><span>{open ? "− COLLAPSE" : "+ EXPAND"}</span>
      </button>
      <div id="signal-inspector-content" hidden={!open}>
        <p className="inspector-status" role="status">
          {state === "reading"
            ? result ? "Updating… Showing the previous response." : "Waiting for Jev’s response…"
            : state === "error"
              ? result ? "Request failed. Showing the previous successful response." : "Request failed. No response to inspect."
              : result ? "Latest response · probabilities shown without display rounding." : "Type a message to inspect Jev’s response."}
        </p>
        <section className="baseline-controls">
          <div className="baseline-actions">
            <button type="button" onClick={onFreeze} disabled={!result || !fresh}>
              {baseline ? "Replace baseline" : "Freeze baseline"}
            </button>
            {baseline && <button type="button" onClick={onClearBaseline}>Clear baseline</button>}
          </div>
          <p>{baseline ? "Baseline saved for this session. Collapse the inspector, edit your text, then reopen to compare." : "Freeze a completed response, then edit your message to compare. No extra API call."}</p>
          {baseline && <><strong>Baseline text</strong><blockquote>{baseline.text}</blockquote></>}
          {result && <details><summary>Text for the displayed response</summary><blockquote>{resultText}</blockquote></details>}
        </section>
        {result && <>
          <div className="inspector-grid">
            <Distribution title="Intent / Choice" signal={result.intent} />
            <Distribution title="Emotion / Choice" signal={result.emotion} />
            <section className="inspector-section">
              <h2>Intensity / Score</h2>
              <dl><dt>Expected intensity</dt><dd>{result.intensity.score.toFixed(2)} / 4</dd>
                <dt>Confidence</dt><dd>{result.intensity.confidence}</dd></dl>
              <details className="intensity-rubric"><summary>Rubric and level probabilities</summary>
                <ol start={0}>{Object.entries(result.intensity.legend).map(([level, description]) =>
                  <li key={level}>{description} <strong>{percent(result.intensity.probabilities[level] ?? 0)}</strong></li>
                )}</ol>
              </details>
              <h2>Urgency / Noul</h2>
              <dl><dt>P(urgent)</dt><dd>{result.urgency}</dd></dl>
              <h2>Request</h2>
              <dl>
                <dt>Model</dt><dd>{result.model}</dd>
                <dt>Server-measured latency</dt><dd>{result.latencyMs} ms</dd>
                <dt>Input tokens</dt><dd>{result.usage.input_tokens}</dd>
                <dt>Output tokens</dt><dd>{result.usage.output_tokens}</dd>
              </dl>
            </section>
          </div>
          <p className="inspector-explanation">Confidence measures distribution concentration, not correctness. Intensity measures expressed emotion, not the writer’s psychological state. “Close alternatives” means the top two probabilities differ by less than 15 percentage points; “unclear” means the largest is below 40%. These are display heuristics.</p>
          {baseline && <section aria-label="Baseline comparison">
            <p className="inspector-explanation">Comparing the displayed response with the frozen baseline. Δ pp = change in percentage points.{!fresh && " Current text is not yet classified; these changes are from the previous response."}</p>
            <div className="inspector-grid">
              <Changes title="Emotion" current={result.emotion} baseline={baseline.result.emotion} />
              <Changes title="Intent" current={result.intent} baseline={baseline.result.intent} />
              <section className="inspector-section"><h2>Other changes</h2>
                <dl><dt>Intensity (0–4)</dt><dd>{baseline.result.intensity.score.toFixed(2)} → {result.intensity.score.toFixed(2)}</dd>
                  <dt>Intensity change</dt><dd>{signed(result.intensity.score - baseline.result.intensity.score)}</dd>
                  <dt>Urgency change</dt><dd>{signed((result.urgency - baseline.result.urgency) * 100)} pp</dd></dl>
                {baseline.result.model !== result.model && <p>Models differ: {baseline.result.model} → {result.model}. Changes may reflect the model as well as the text.</p>}
              </section>
            </div>
          </section>}
          <details className="inspector-json">
            <summary>Raw JSON · app API response</summary>
            <div className="inspector-copy">
              <button type="button" onClick={copyJson}>Copy JSON</button>
              <span role="status">{copyStatus}</span>
            </div>
            <pre tabIndex={0} aria-label="Raw response JSON">{json}</pre>
          </details>
        </>}
        <details className="inspector-json">
          <summary>Questions and criteria sent to Jev</summary>
          <pre tabIndex={0}>{JSON.stringify(signalQuestions, null, 2)}</pre>
        </details>
      </div>
    </section>
  );
}
