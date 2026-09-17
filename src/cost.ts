// Account rates confirmed by the user’s TypeSafe billing screen, September 17, 2026.
// Usage-derived estimate; not an account billing ledger.
export const INPUT_USD_PER_MILLION = 0.042;
export const OUTPUT_USD_PER_MILLION = 0;

export type SessionUsage = { input: number; output: number; completed: number; unreported: number };
export const emptyUsage: SessionUsage = { input: 0, output: 0, completed: 0, unreported: 0 };

export function estimatedCost(usage: Pick<SessionUsage, "input" | "output">) {
  return (usage.input * INPUT_USD_PER_MILLION + usage.output * OUTPUT_USD_PER_MILLION) / 1_000_000;
}

export function addUsage(total: SessionUsage, usage: { input_tokens: number; output_tokens: number }): SessionUsage {
  return { ...total, input: total.input + usage.input_tokens, output: total.output + usage.output_tokens, completed: total.completed + 1 };
}
