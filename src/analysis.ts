import type { ChoiceSignal } from "./types";

// Display heuristics, not calibrated thresholds for correctness.
export function emotionReading(signal: ChoiceSignal) {
  const ranked = Object.entries(signal.probabilities).sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  const close = Boolean(first && second && first[1] - second[1] < 0.15);
  const unclear = !first || first[1] < 0.4;
  return {
    headline: unclear ? "unclear" : close ? `${first[0]} / ${second[0]}` : signal.choice,
    description: unclear ? "NO CLEAR EMOTION" : close ? "CLOSE ALTERNATIVES" : "EXPRESSED EMOTION",
    probability: signal.probabilities[signal.choice] ?? 0,
    ranked,
  };
}

export function probabilityChanges(current: Record<string, number>, baseline: Record<string, number>) {
  return [...new Set([...Object.keys(current), ...Object.keys(baseline)])].map((label) => ({
    label,
    before: baseline[label] ?? 0,
    after: current[label] ?? 0,
    delta: ((current[label] ?? 0) - (baseline[label] ?? 0)) * 100,
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
