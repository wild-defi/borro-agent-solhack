import type { DecisionValidationResult } from "@/lib/risk/validation";

import type { AIDecision } from "./decision";
import type { AllowedAction, PolicyConfig } from "./policy";
import type { PositionSnapshot } from "./snapshot";

export type ExecutionMode = "mock" | "record_only" | "kamino_repay";

export type ExecutionStatus =
  | "pending"
  | "executing"
  | "success"
  | "failed"
  | "rejected"
  | "simulated"
  | "logged";

export interface ExecutionReasoningContext {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  rawDecision: AIDecision;
  validatedDecision: AIDecision;
  validation: DecisionValidationResult;
}

export interface ExecutionRecord {
  decisionId: string;
  action: AllowedAction;
  mode: ExecutionMode;
  requestedAmountUsd: number;
  executedAmountUsd: number;
  status: ExecutionStatus;
  txSignature: string | null;
  logTxSignature?: string | null;
  policyAddress?: string | null;
  decisionLogAddress?: string | null;
  healthFactorBefore?: number;
  healthFactorAfter?: number;
  timestamp: number;
  reason: string;
  reasoning?: ExecutionReasoningContext | null;
}
