import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { SignalResult } from "./src/types";
import { signalQuestions } from "./src/questions";

export async function classify(text: string, apiKey: string, signal?: AbortSignal): Promise<SignalResult> {
  const client = new TypeSafeClient({ apiKey, logLevel: "off", retry: { maxRetries: 0 } });
  const startedAt = performance.now();
  const result = await client.systemOne({
    state: { message: text },
    questions: signalQuestions,
  }, { signal });
  return {
    model: result.model,
    intent: result.answers.intent,
    emotion: result.answers.emotion,
    urgency: result.answers.urgency.noul,
    intensity: result.answers.intensity,
    usage: result.usage,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
