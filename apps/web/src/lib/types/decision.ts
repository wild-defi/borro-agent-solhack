import type { AllowedAction } from "./policy";

export interface AIDecision {
  action: AllowedAction;
  targetHealthFactor: number;
  repayAmountUsd: number;
  collateralToSell?: string;
  confidence: number;
  reason: string;
}
