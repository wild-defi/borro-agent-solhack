import type { AllowedAction } from "./policy";

export type ExecutionMode = "mock" | "record_only" | "kamino_repay";

export type ExecutionStatus =
  | "pending"
  | "executing"
  | "success"
  | "failed"
  | "rejected"
  | "simulated"
  | "logged";

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
}
