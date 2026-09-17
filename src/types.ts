export type ChoiceSignal = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type SignalResult = {
  model: string;
  intent: ChoiceSignal;
  emotion: ChoiceSignal;
  urgency: number;
  intensity: {
    type: "score";
    score: number;
    confidence: number;
    legend: Record<string, string>;
    probabilities: Record<string, number>;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  latencyMs: number;
};

export type SignalSnapshot = { text: string; result: SignalResult };
