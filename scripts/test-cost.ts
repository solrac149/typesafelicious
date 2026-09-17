import assert from "node:assert/strict";
import { test } from "node:test";
import { addUsage, emptyUsage, estimatedCost } from "../src/cost";

test("adds all received usage at full precision without mutating the reset state", () => {
  const first = addUsage(emptyUsage, { input_tokens: 1000, output_tokens: 50 });
  const total = addUsage(first, { input_tokens: 2000, output_tokens: 100 });
  assert.equal(total.completed, 2);
  assert.equal(total.input, 3000);
  assert.equal(total.output, 150);
  assert.ok(Math.abs(estimatedCost(total) - 0.000126) < 1e-12);
  assert.equal(emptyUsage.completed, 0);
  assert.equal(estimatedCost(emptyUsage), 0);
});
