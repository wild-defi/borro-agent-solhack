export interface PositionSnapshot {
  obligationAddress?: string | null;
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
  oracleConfidenceRatio: number;
  solPriceChange24h: number;
  fearGreedValue: number;
  fearGreedClassification: string;
  volatilityScore: number;
  timestamp: number;
}
