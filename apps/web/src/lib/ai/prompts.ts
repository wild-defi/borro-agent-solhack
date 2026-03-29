import type { Policy, PositionSnapshot } from "@/lib/types";

export function buildDecisionSystemPrompt() {
  return [
    "You are Borro Agent, an autonomous lending risk manager for Solana.",
    "Your task is to protect user positions from liquidation.",
    "You must return JSON only.",
    "Choose the safest valid action for the user's current position.",
    "Prefer DO_NOTHING when the position is healthy.",
    "Prefer REPAY_FROM_BUFFER when health factor is below target and buffer is available.",
    "Never suggest a repay amount larger than the available buffer or the debt.",
  ].join(" ");
}

export function buildDecisionUserPrompt(
  snapshot: PositionSnapshot,
  policy?: Partial<Policy>
) {
  return JSON.stringify(
    {
      policy: {
        riskProfile: policy?.riskProfile ?? "balanced",
        targetHealthFactor: policy?.targetHealthFactor ?? 1.25,
        allowedActions: policy?.allowedActions ?? [
          "DO_NOTHING",
          "REPAY_FROM_BUFFER",
        ],
        maxRepayPerActionUsd: policy?.maxRepayPerActionUsd ?? 500,
      },
      snapshot,
      instructions: {
        output: {
          action:
            "DO_NOTHING | REPAY_FROM_BUFFER | REPAY_WITH_COLLATERAL | PARTIAL_DELEVERAGE",
          targetHealthFactor: "number",
          repayAmountUsd: "number",
          collateralToSell: "string (optional)",
          confidence: "0..1 number",
          reason: "short explanation",
        },
      },
    },
    null,
    2
  );
}
