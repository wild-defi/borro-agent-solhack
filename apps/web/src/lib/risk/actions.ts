import type { AIDecision } from "@/lib/types";

export function buildDoNothingDecision(
  targetHealthFactor: number,
  reason: string,
  confidence = 0.5
): AIDecision {
  return {
    action: "DO_NOTHING",
    targetHealthFactor: Number(targetHealthFactor.toFixed(2)),
    repayAmountUsd: 0,
    confidence: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
    reason,
  };
}

export function sanitizeTargetHealthFactor(
  requestedTargetHealthFactor: number,
  fallbackTargetHealthFactor: number
): number {
  if (!Number.isFinite(requestedTargetHealthFactor)) {
    return Number(fallbackTargetHealthFactor.toFixed(2));
  }

  return Number(Math.min(3, Math.max(1.05, requestedTargetHealthFactor)).toFixed(2));
}

export function sanitizeRepayAmount(requestedAmountUsd: number): number {
  if (!Number.isFinite(requestedAmountUsd) || requestedAmountUsd <= 0) {
    return 0;
  }

  return Number(requestedAmountUsd.toFixed(2));
}
