import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { SignalField } from "./SignalField";
import { SignalInspector } from "./SignalInspector";
import type { SignalResult } from "./types";

const idleProbabilities = {
  neutral: 0.125,
  happy: 0.125,
  excited: 0.125,
  sad: 0.125,
  angry: 0.125,
  anxious: 0.125,
  affectionate: 0.125,
  sarcastic: 0.125,
};

type RequestState = "idle" | "reading" | "resolved" | "error";

function formatLabel(label: string) {
  return label.replaceAll("_", " ").toUpperCase();
}

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SignalResult | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const emotionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setRequestState("idle");
      setResult(null);
      setError("");
      return;
    }

    setRequestState("reading");
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmedText }),
          signal: controller.signal,
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Classification failed.");

        startTransition(() => {
          setResult(payload as SignalResult);
          setRequestState("resolved");
          setError("");
        });
      } catch (caughtError) {
        if (controller.signal.aborted) return;
        setRequestState("error");
        setError(caughtError instanceof Error ? caughtError.message : "Classification failed.");
      }
    }, 420);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [text]);

  const emotion = result?.emotion.choice ?? "listening";
  const intent = result?.intent.choice ?? "awaiting signal";
  const probabilities = result?.emotion.probabilities ?? idleProbabilities;
  const sortedProbabilities = Object.entries(probabilities).sort((left, right) => right[1] - left[1]);
  const confidence = result?.emotion.confidence ?? 0;

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const heading = emotionRef.current;
    if (!shell || !heading) return;

    const alignInspector = () => {
      // Use layout offsets so the heading's entrance animation doesn't move the panel.
      let midpoint = heading.offsetHeight / 2;
      let element: HTMLElement | null = heading;
      while (element && element !== shell) {
        midpoint += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }
      shell.style.setProperty("--inspector-top", `${midpoint}px`);
    };
    const observer = new ResizeObserver(alignInspector);
    observer.observe(shell);
    observer.observe(heading);
    alignInspector();
    return () => observer.disconnect();
  }, [emotion]);

  return (
    <main ref={shellRef} className={`app-shell${inspectorOpen ? "" : " app-shell--inspector-collapsed"}`}>
      <section className="output-stage" aria-live="polite">
        <SignalField probabilities={probabilities} activeLabel={result?.emotion.choice ?? "neutral"} />

        <header className="masthead">
          <div className="brand">JEV / SIGNAL</div>
          <div className="system-mark">TS.AI.0S1</div>
          <div className={`connection-state connection-state--${requestState}`}>
            <span className="status-dot" />
            {requestState === "reading" ? "DECODING" : requestState === "error" ? "SIGNAL LOST" : "SYSTEM ONE"}
          </div>
        </header>

        <div className="result-lockup">
          <div className="result-kicker">
            <span>DOMINANT EMOTION</span>
            <span>{result ? `${Math.round(confidence * 100)}% CONFIDENCE` : "LIVE ANALYSIS"}</span>
          </div>
          <h1 ref={emotionRef} key={emotion} className={`emotion-word emotion-word--${emotion}`}>
            {formatLabel(emotion)}
          </h1>
          <div className="intent-line">
            <span>PRIMARY INTENT</span>
            <strong>{formatLabel(intent)}</strong>
          </div>
        </div>

        <div className="telemetry">
          <div className="probability-grid">
            {sortedProbabilities.map(([label, probability]) => (
              <div className="probability" key={label}>
                <div className="probability-meta">
                  <span>{formatLabel(label)}</span>
                  <span>{Math.round(probability * 100)}%</span>
                </div>
                <div className="probability-track">
                  <span style={{ transform: `scaleX(${probability})` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="run-meta">
            <span>URG {result ? Math.round(result.urgency * 100) : "--"}</span>
            <span>{result ? `${result.latencyMs}MS` : "---MS"}</span>
            <span>{result?.model?.toUpperCase() ?? "JEV-LATEST"}</span>
          </div>
        </div>
      </section>

      <section className="input-stage" inert={inspectorOpen}>
        <div className="input-header">
          <span>UNSTRUCTURED STATE / TEXT</span>
          <div className="input-actions">
            <span>{text.length.toString().padStart(4, "0")} CHARS</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setText("")}
              disabled={!text}
              aria-label="Clear input"
              title="Clear input"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="TYPE WHAT YOU'RE THINKING..."
          maxLength={8_000}
          autoFocus
          spellCheck
          aria-label="Text to classify"
        />
        <footer className="input-footer">
          <span>{error || "CHOICE × 2 / NOUL × 1"}</span>
          <span>{result ? `${result.usage.input_tokens} INPUT TOKENS` : "PROBABILISTIC OUTPUT"}</span>
        </footer>
      </section>
      <SignalInspector result={result} state={requestState} open={inspectorOpen}
        onToggle={() => setInspectorOpen((open) => !open)} />
    </main>
  );
}

export default App;
