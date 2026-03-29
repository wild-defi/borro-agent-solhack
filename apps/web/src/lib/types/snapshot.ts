export interface PositionSnapshot {
  collateralAsset: string;
  debtAsset: string;
  collateralValueUsd: number;
  debtValueUsd: number;
  ltv: number;
  healthFactor: number;
  liquidationThreshold: number;
  distanceToLiquidation: number;
  availableBufferUsd: number;
  oracleConfidence: number;
  volatilityScore: number;
  timestamp: number;
}
