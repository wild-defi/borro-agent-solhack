import type { AIDecision, AllowedAction } from "@/lib/types";

const ALLOWED_ACTIONS: AllowedAction[] = [
  "DO_NOTHING",
  "REPAY_FROM_BUFFER",
  "REPAY_WITH_COLLATERAL",
  "PARTIAL_DELEVERAGE",
];

function isAllowedAction(value: unknown): value is AllowedAction {
  return typeof value === "string" && ALLOWED_ACTIONS.includes(value as AllowedAction);
}

function parseNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid AI decision field: ${field}`);
  }

  return value;
}

export function parseAIDecision(input: unknown): AIDecision {
  if (!input || typeof input !== "object") {
    throw new Error("AI decision must be an object");
  }

  const decision = input as Record<string, unknown>;

  if (!isAllowedAction(decision.action)) {
    throw new Error("Invalid AI decision field: action");
  }

  if (typeof decision.reason !== "string" || decision.reason.trim().length === 0) {
    throw new Error("Invalid AI decision field: reason");
  }

  const collateralToSell =
    typeof decision.collateralToSell === "string"
      ? decision.collateralToSell
      : undefined;

  return {
    action: decision.action,
    targetHealthFactor: parseNumber(decision.targetHealthFactor, "targetHealthFactor"),
    repayAmountUsd: parseNumber(decision.repayAmountUsd, "repayAmountUsd"),
    collateralToSell,
    confidence: parseNumber(decision.confidence, "confidence"),
    reason: decision.reason.trim(),
  };
}

export const aiDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ALLOWED_ACTIONS,
    },
    targetHealthFactor: {
      type: "number",
    },
    repayAmountUsd: {
      type: "number",
    },
    collateralToSell: {
      type: "string",
    },
    confidence: {
      type: "number",
    },
    reason: {
      type: "string",
    },
  },
  required: ["action", "targetHealthFactor", "repayAmountUsd", "confidence", "reason"],
} as const;
