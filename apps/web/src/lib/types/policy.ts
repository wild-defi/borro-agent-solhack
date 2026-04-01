export type RiskProfile = "conservative" | "balanced" | "aggressive";

export type AllowedAction =
  | "DO_NOTHING"
  | "REPAY_FROM_BUFFER"
  | "REPAY_WITH_COLLATERAL"
  | "PARTIAL_DELEVERAGE";

export interface Policy {
  owner: string;
  obligationId: string;
  riskProfile: RiskProfile;
  targetHealthFactor: number;
  allowedActions: AllowedAction[];
  maxRepayPerActionUsd: number;
  maxDailyInterventionUsd: number;
  cooldownSeconds: number;
  enabled: boolean;
}

export type PolicyConfig = Pick<
  Policy,
  | "riskProfile"
  | "targetHealthFactor"
  | "allowedActions"
  | "maxRepayPerActionUsd"
  | "maxDailyInterventionUsd"
  | "cooldownSeconds"
  | "enabled"
>;
