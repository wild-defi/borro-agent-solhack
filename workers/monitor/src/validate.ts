import type { PositionSnapshot } from "./fetch-position";
import type { WorkerDecision, WorkerPolicy } from "./decide";

export interface WorkerValidationContext {
  now?: number;
  lastInterventionAt?: number;
  dailyInterventionUsedUsd?: number;
}

export interface WorkerValidationResult {
  approved: boolean;
  wasModified: boolean;
  reasons: string[];
  originalDecision: WorkerDecision;
  validatedDecision: WorkerDecision;
}

function confidenceThresholdForRiskProfile(
  riskProfile: WorkerPolicy["riskProfile"]
): number {
  switch (riskProfile) {
    case "conservative":
      return 0.7;
    case "aggressive":
      return 0.45;
    default:
      return 0.55;
  }
}

function buildDoNothingDecision(
  targetHealthFactor: number,
  reason: string,
  confidence: number
): WorkerDecision {
  return {
    action: "DO_NOTHING",
    targetHealthFactor: Number(targetHealthFactor.toFixed(2)),
    repayAmountUsd: 0,
    confidence: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
    reason,
  };
}

export function validateDecision(
  snapshot: PositionSnapshot,
  policy: WorkerPolicy,
  decision: WorkerDecision,
  context: WorkerValidationContext = {}
): WorkerValidationResult {
  const reasons: string[] = [];
  const now = context.now ?? Date.now();
  const cooldownSeconds = policy.cooldownSeconds ?? 300;
  const confidenceThreshold = confidenceThresholdForRiskProfile(policy.riskProfile);

  if (policy.enabled === false) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Policy is disabled."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        policy.targetHealthFactor,
        "Policy is disabled.",
        decision.confidence
      ),
    };
  }

  if (
    context.lastInterventionAt &&
    now - context.lastInterventionAt < cooldownSeconds * 1000
  ) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Cooldown is still active."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        policy.targetHealthFactor,
        "Cooldown is still active.",
        decision.confidence
      ),
    };
  }

  if (decision.confidence < confidenceThreshold) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Decision confidence is below threshold."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        policy.targetHealthFactor,
        "Decision confidence is below threshold.",
        decision.confidence
      ),
    };
  }

  if (!policy.allowedActions.includes(decision.action)) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Action is not allowed by policy."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        policy.targetHealthFactor,
        "Action is not allowed by policy.",
        decision.confidence
      ),
    };
  }

  if (decision.action === "DO_NOTHING") {
    return {
      approved: true,
      wasModified: false,
      reasons,
      originalDecision: decision,
      validatedDecision: decision,
    };
  }

  const dailyRemainingUsd = Math.max(
    0,
    (policy.maxDailyInterventionUsd ?? 1500) -
      (context.dailyInterventionUsedUsd ?? 0)
  );
  const maxRepayUsd = Math.max(
    0,
    Math.min(
      snapshot.availableBufferUsd,
      snapshot.debtValueUsd,
      policy.maxRepayPerActionUsd,
      dailyRemainingUsd
    )
  );
  const validatedRepayAmount = Number(
    Math.min(Math.max(decision.repayAmountUsd, 0), maxRepayUsd).toFixed(2)
  );

  if (validatedRepayAmount !== decision.repayAmountUsd) {
    reasons.push("Repay amount was capped by policy, debt, or buffer limits.");
  }

  if (validatedRepayAmount <= 0) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Validated repay amount is zero after checks."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        policy.targetHealthFactor,
        "Validated repay amount is zero after checks.",
        decision.confidence
      ),
    };
  }

  return {
    approved: reasons.length === 0,
    wasModified: reasons.length > 0,
    reasons,
    originalDecision: decision,
    validatedDecision: {
      ...decision,
      repayAmountUsd: validatedRepayAmount,
      targetHealthFactor: Number(
        Math.min(3, Math.max(1.05, decision.targetHealthFactor)).toFixed(2)
      ),
    },
  };
}
