import assert from "node:assert/strict";
import { test } from "node:test";
import { emotionReading, probabilityChanges } from "../src/analysis";

test("distinguishes a clear winner, close alternatives and diffuse uncertainty", () => {
  const read = (probabilities: Record<string, number>) => emotionReading({
    type: "choice", choice: "angry", confidence: 0.8, probabilities,
  });
  assert.equal(read({ angry: 0.9, anxious: 0.1 }).headline, "angry");
  assert.equal(read({ angry: 0.51, anxious: 0.49 }).headline, "angry / anxious");
  assert.equal(read({ angry: 0.35, anxious: 0.34, sad: 0.31 }).headline, "unclear");
  assert.equal(read({ angry: 0.51, anxious: 0.49 }).probability, 0.51);
});

test("compares percentage points without mutating the frozen distribution", () => {
  const baseline = Object.freeze({ angry: 0.8, sad: 0.2 });
  const changes = probabilityChanges({ angry: 0.2, happy: 0.8 }, baseline);
  assert.deepEqual(changes[0], { label: "happy", before: 0, after: 0.8, delta: 80 });
  assert.ok(Math.abs(changes.find(row => row.label === "angry")!.delta + 60) < 1e-10);
  assert.deepEqual(baseline, { angry: 0.8, sad: 0.2 });
});
