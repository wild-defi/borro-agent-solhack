import type { PositionSnapshot } from "@/lib/types";

export function calculateDistanceToLiquidation(
  ltv: number,
  liquidationThreshold: number
): number {
  if (liquidationThreshold <= 0) return 0;

  const distance = ((liquidationThreshold - ltv) / liquidationThreshold) * 100;
  return Math.max(0, Number(distance.toFixed(2)));
}

export function calculateVolatilityScore(
  oracleConfidence: number,
  distanceToLiquidation: number,
  solPriceChange24h = 0
): number {
  const confidencePenalty = Math.max(0, 1 - oracleConfidence);
  const liquidationPressure = Math.max(0, 1 - distanceToLiquidation / 20);
  const marketStress = Math.min(1, Math.max(0, -solPriceChange24h) / 12);
  const score =
    confidencePenalty * 0.25 +
    liquidationPressure * 0.5 +
    marketStress * 0.25;

  return Number(Math.min(1, Math.max(0, score)).toFixed(2));
}

export function calculateSuggestedRepayAmount(
  snapshot: PositionSnapshot,
  targetHealthFactor: number,
  maxRepayPerActionUsd: number
): number {
  const hfGap = Math.max(0, targetHealthFactor - snapshot.healthFactor);
  const urgencyFactor =
    hfGap > 0 ? hfGap / Math.max(targetHealthFactor, 1) : 0.05;
  const baseAmount = snapshot.debtValueUsd * Math.max(0.05, urgencyFactor);
  const repayAmount = Math.min(
    snapshot.availableBufferUsd,
    snapshot.debtValueUsd,
    maxRepayPerActionUsd,
    baseAmount
  );

  return Number(Math.max(0, repayAmount).toFixed(2));
}
