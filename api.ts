import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import type { SignalResult } from "./src/types";

const intentCriteria = {
  statement: "Sharing information, an observation, or a factual claim",
  question: "Seeking information, clarification, or an answer",
  request: "Asking someone to do or provide something",
  complaint: "Expressing dissatisfaction and wanting acknowledgment or resolution",
  praise: "Expressing approval, gratitude, or admiration",
  plan: "Proposing or describing a future course of action",
  warning: "Alerting someone to danger, risk, or consequences",
  disclosure: "Revealing personal, private, or previously withheld information",
  other: "None of the other communicative intents clearly apply",
} as const;

const emotionCriteria = {
  neutral: "No strong emotion is expressed",
  happy: "Contentment, pleasure, gratitude, or joy",
  excited: "High-energy anticipation, enthusiasm, or delight",
  sad: "Sorrow, disappointment, grief, or loneliness",
  angry: "Anger, hostility, resentment, or outrage",
  anxious: "Worry, fear, nervousness, or unease",
  affectionate: "Warmth, fondness, care, or love",
  sarcastic: "Mocking, ironic, or contemptuous humor",
} as const;

export async function classify(text: string, apiKey: string, signal?: AbortSignal): Promise<SignalResult> {
  const client = new TypeSafeClient({ apiKey, logLevel: "off", retry: { maxRetries: 0 } });
  const startedAt = performance.now();
  const result = await client.systemOne({
    state: { message: text },
    questions: {
      intent: choice("What is the primary communicative intent of this message?", intentCriteria),
      emotion: choice("What is the dominant emotional tone expressed in this message?", emotionCriteria),
      urgency: noul("The message conveys urgency or requires immediate attention."),
    },
  }, { signal });
  return {
    model: result.model,
    intent: result.answers.intent,
    emotion: result.answers.emotion,
    urgency: result.answers.urgency.noul,
    usage: result.usage,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
