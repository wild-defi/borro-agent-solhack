import type { PositionSnapshot } from "./fetch-position";

function calculateDistanceToLiquidation(
  ltv: number,
  liquidationThreshold: number
): number {
  if (liquidationThreshold <= 0) return 0;
  return Math.max(
    0,
    Number((((liquidationThreshold - ltv) / liquidationThreshold) * 100).toFixed(2))
  );
}

function calculateVolatilityScore(
  oracleConfidence: number,
  distanceToLiquidation: number
): number {
  const confidencePenalty = Math.max(0, 1 - oracleConfidence);
  const liquidationPressure = Math.max(0, 1 - distanceToLiquidation / 20);
  return Number(
    Math.min(1, Math.max(0, confidencePenalty * 0.4 + liquidationPressure * 0.6)).toFixed(2)
  );
}

export function buildSnapshot(snapshot: PositionSnapshot): PositionSnapshot {
  const distanceToLiquidation =
    snapshot.distanceToLiquidation ??
    calculateDistanceToLiquidation(snapshot.ltv, snapshot.liquidationThreshold);
  const oracleConfidence = snapshot.oracleConfidence ?? 0.95;
  const volatilityScore =
    snapshot.volatilityScore ??
    calculateVolatilityScore(oracleConfidence, distanceToLiquidation);

  return {
    ...snapshot,
    distanceToLiquidation,
    oracleConfidence,
    volatilityScore,
    timestamp: snapshot.timestamp ?? Date.now(),
  };
}
