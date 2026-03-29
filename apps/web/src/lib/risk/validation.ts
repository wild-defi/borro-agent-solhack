import type { AIDecision, AllowedAction, Policy, PositionSnapshot, RiskProfile } from "@/lib/types";
import {
  buildDoNothingDecision,
  sanitizeRepayAmount,
  sanitizeTargetHealthFactor,
} from "@/lib/risk/actions";

export interface ValidationContext {
  now?: number;
  lastInterventionAt?: number;
  dailyInterventionUsedUsd?: number;
}

export interface DecisionValidationResult {
  approved: boolean;
  wasModified: boolean;
  reasons: string[];
  originalDecision: AIDecision;
  validatedDecision: AIDecision;
}

interface ResolvedPolicy {
  enabled: boolean;
  riskProfile: RiskProfile;
  targetHealthFactor: number;
  allowedActions: AllowedAction[];
  maxRepayPerActionUsd: number;
  maxDailyInterventionUsd: number;
  cooldownSeconds: number;
}

function resolvePolicy(policy?: Partial<Policy>): ResolvedPolicy {
  return {
    enabled: policy?.enabled ?? true,
    riskProfile: policy?.riskProfile ?? "balanced",
    targetHealthFactor: policy?.targetHealthFactor ?? 1.25,
    allowedActions: policy?.allowedActions ?? ["DO_NOTHING", "REPAY_FROM_BUFFER"],
    maxRepayPerActionUsd: policy?.maxRepayPerActionUsd ?? 500,
    maxDailyInterventionUsd: policy?.maxDailyInterventionUsd ?? 1_500,
    cooldownSeconds: policy?.cooldownSeconds ?? 300,
  };
}

function confidenceThresholdForProfile(riskProfile: RiskProfile): number {
  switch (riskProfile) {
    case "conservative":
      return 0.7;
    case "aggressive":
      return 0.45;
    default:
      return 0.55;
  }
}

function pushReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function validateAIDecision(
  snapshot: PositionSnapshot,
  policy: Partial<Policy> | undefined,
  decision: AIDecision,
  context: ValidationContext = {}
): DecisionValidationResult {
  const resolvedPolicy = resolvePolicy(policy);
  const reasons: string[] = [];
  const now = context.now ?? Date.now();
  const confidenceThreshold = confidenceThresholdForProfile(resolvedPolicy.riskProfile);

  if (!resolvedPolicy.enabled) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Policy is disabled."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        resolvedPolicy.targetHealthFactor,
        "Policy is disabled.",
        decision.confidence
      ),
    };
  }

  if (
    context.lastInterventionAt &&
    resolvedPolicy.cooldownSeconds > 0 &&
    now - context.lastInterventionAt < resolvedPolicy.cooldownSeconds * 1000
  ) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Cooldown is still active."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        resolvedPolicy.targetHealthFactor,
        "Cooldown is still active.",
        decision.confidence
      ),
    };
  }

  if (decision.confidence < confidenceThreshold) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Decision confidence is below the policy threshold."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        resolvedPolicy.targetHealthFactor,
        "Decision confidence is below the policy threshold.",
        decision.confidence
      ),
    };
  }

  if (!resolvedPolicy.allowedActions.includes(decision.action)) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Action is not allowed by policy."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        resolvedPolicy.targetHealthFactor,
        "Action is not allowed by policy.",
        decision.confidence
      ),
    };
  }

  const dailyRemainingUsd = Math.max(
    0,
    resolvedPolicy.maxDailyInterventionUsd - (context.dailyInterventionUsedUsd ?? 0)
  );
  const maxRepayUsd = Math.max(
    0,
    Math.min(
      resolvedPolicy.maxRepayPerActionUsd,
      dailyRemainingUsd,
      snapshot.availableBufferUsd,
      snapshot.debtValueUsd
    )
  );

  const sanitizedTargetHealthFactor = sanitizeTargetHealthFactor(
    decision.targetHealthFactor,
    resolvedPolicy.targetHealthFactor
  );

  if (decision.action === "DO_NOTHING") {
    const validatedDecision = {
      ...decision,
      targetHealthFactor: sanitizedTargetHealthFactor,
      repayAmountUsd: 0,
    };

    return {
      approved: true,
      wasModified: false,
      reasons,
      originalDecision: decision,
      validatedDecision,
    };
  }

  const sanitizedRepayAmount = sanitizeRepayAmount(decision.repayAmountUsd);
  const cappedRepayAmount = Number(Math.min(sanitizedRepayAmount, maxRepayUsd).toFixed(2));

  if (cappedRepayAmount !== sanitizedRepayAmount) {
    pushReason(reasons, "Repay amount was capped by policy, debt, or buffer limits.");
  }

  if (decision.action === "REPAY_FROM_BUFFER" && snapshot.availableBufferUsd <= 0) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["No safety buffer is available for repayment."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        resolvedPolicy.targetHealthFactor,
        "No safety buffer is available for repayment.",
        decision.confidence
      ),
    };
  }

  if (cappedRepayAmount <= 0) {
    return {
      approved: false,
      wasModified: true,
      reasons: ["Validated repay amount is zero after policy checks."],
      originalDecision: decision,
      validatedDecision: buildDoNothingDecision(
        resolvedPolicy.targetHealthFactor,
        "Validated repay amount is zero after policy checks.",
        decision.confidence
      ),
    };
  }

  return {
    approved: reasons.length === 0,
    wasModified:
      reasons.length > 0 ||
      cappedRepayAmount !== decision.repayAmountUsd ||
      sanitizedTargetHealthFactor !== decision.targetHealthFactor,
    reasons,
    originalDecision: decision,
    validatedDecision: {
      ...decision,
      targetHealthFactor: sanitizedTargetHealthFactor,
      repayAmountUsd: cappedRepayAmount,
    },
  };
}
