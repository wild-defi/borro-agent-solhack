import type { PositionSnapshot } from "@/lib/types";
import { fetchUserPosition, type KaminoPositionData } from "@/lib/solana/kamino";
import {
  calculateDistanceToLiquidation,
  calculateVolatilityScore,
} from "@/lib/risk/metrics";

const MOCK_POSITION_BASE = {
  collateralValueUsd: 4900,
  debtValueUsd: 3800,
  oracleConfidence: 0.89,
  availableBufferUsd: 300,
};

function getMockPosition(): PositionSnapshot {
  const s = MOCK_POSITION_BASE;
  const liquidationThreshold = 80;
  const ltv = Number(((s.debtValueUsd / s.collateralValueUsd) * 100).toFixed(2));
  const healthFactor = Number((liquidationThreshold / ltv).toFixed(2));
  const distanceToLiquidation = Number((((liquidationThreshold - ltv) / liquidationThreshold) * 100).toFixed(2));
  const volatilityScore = Number((1 - s.oracleConfidence + (ltv > 70 ? 0.3 : 0)).toFixed(2));

  return {
    collateralAsset: "SOL",
    debtAsset: "USDC",
    collateralValueUsd: s.collateralValueUsd,
    debtValueUsd: s.debtValueUsd,
    ltv,
    healthFactor,
    liquidationThreshold,
    distanceToLiquidation,
    availableBufferUsd: s.availableBufferUsd,
    oracleConfidence: s.oracleConfidence,
    volatilityScore,
    timestamp: Date.now(),
  };
}

function toSnapshot(data: KaminoPositionData): PositionSnapshot {
  const distanceToLiquidation = calculateDistanceToLiquidation(
    data.ltv,
    data.liquidationThreshold
  );
  const oracleConfidence = 0.95; // TODO: fetch from Pyth
  const volatilityScore = calculateVolatilityScore(
    oracleConfidence,
    distanceToLiquidation
  );

  return {
    ...data,
    distanceToLiquidation,
    availableBufferUsd: 0, // will be filled from buffer vault later
    oracleConfidence,
    volatilityScore,
    timestamp: Date.now(),
  };
}

export async function getPositionSnapshot(
  walletAddress: string,
  useMock = false
): Promise<PositionSnapshot> {
  if (useMock) return getMockPosition();

  const position = await fetchUserPosition(walletAddress);
  if (!position) return getMockPosition();

  return toSnapshot(position);
}
