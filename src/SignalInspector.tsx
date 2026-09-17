import { useEffect, useState } from "react";
import type { ChoiceSignal, SignalResult } from "./types";

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

export function SignalInspector({ result, state, open, onToggle }: {
  result: SignalResult | null;
  state: "idle" | "reading" | "resolved" | "error";
  open: boolean;
  onToggle: () => void;
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
        {result && <>
          <div className="inspector-grid">
            <Distribution title="Intent / Choice" signal={result.intent} />
            <Distribution title="Emotion / Choice" signal={result.emotion} />
            <section className="inspector-section">
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
          <details className="inspector-json">
            <summary>Raw JSON · app API response</summary>
            <div className="inspector-copy">
              <button type="button" onClick={copyJson}>Copy JSON</button>
              <span role="status">{copyStatus}</span>
            </div>
            <pre tabIndex={0} aria-label="Raw response JSON">{json}</pre>
          </details>
        </>}
      </div>
    </section>
  );
}
