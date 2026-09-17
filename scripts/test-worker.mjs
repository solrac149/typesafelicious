import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../dist/server/index.js";

const origin = "https://jev.example";
const env = { ASSETS: { fetch: async () => new Response("static asset") } };
const request = (body, headers = {}) => new Request(`${origin}/api/classify`, {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
});

test("serves frontend assets and health without exposing configuration", async () => {
  assert.equal(await (await worker.fetch(new Request(origin), env)).text(), "static asset");
  const response = await worker.fetch(new Request(`${origin}/api/health`), {
    ...env, TYPESAFE_API_KEY: "test-only-secret",
  });
  assert.deepEqual(await response.json(), { configured: true });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("rejects invalid requests before contacting Jev", async () => {
  for (const [body, headers, expected] of [
    ["{", {}, 400],
    ['{"text":" "}', {}, 400],
    [JSON.stringify({ text: "x".repeat(8001) }), {}, 400],
    ["x".repeat(32769), {}, 413],
    ['{"text":"hi"}', { Origin: "https://elsewhere.example" }, 403],
    ['{"text":"hi"}', { "Content-Type": "text/plain" }, 415],
    ['{"text":"hi"}', {}, 503],
  ]) {
    assert.equal((await worker.fetch(request(body, headers), env)).status, expected);
  }
});

test("keeps the key upstream and preserves the app response contract", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const choice = { type: "choice", choice: "happy", confidence: 0.9, probabilities: { happy: 0.9, sad: 0.1 } };
  const intensity = { type: "score", score: 2.4, confidence: 0.6,
    probabilities: { 0: 0, 1: 0, 2: 0.6, 3: 0.4, 4: 0 },
    legend: { 0: "None", 1: "Restrained", 2: "Explicit", 3: "Emphatic", 4: "Overwhelming" } };
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer test-only-secret");
    const payload = JSON.parse(init.body);
    assert.deepEqual(payload.state, { message: "hello" });
    assert.deepEqual(Object.keys(payload.questions), ["intent", "emotion", "urgency", "intensity"]);
    assert.equal(payload.questions.intensity.type, "score");
    return Response.json({ model: "test-model", answers: {
      intent: choice, emotion: choice, urgency: { type: "noul", noul: 0.2 }, intensity,
    }, usage: { input_tokens: 12, output_tokens: 4 } });
  };
  try {
    const response = await worker.fetch(request('{"text":" hello "}'), {
      ...env, TYPESAFE_API_KEY: "test-only-secret",
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.emotion, choice);
    assert.deepEqual(result.intensity, intensity);
    assert.equal(result.urgency, 0.2);
    assert.equal(result.usage.output_tokens, 4);
    assert.equal(typeof result.latencyMs, "number");
    assert.equal(JSON.stringify(result).includes("test-only-secret"), false);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
