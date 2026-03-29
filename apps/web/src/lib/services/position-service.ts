import type { PositionSnapshot } from "@/lib/types";
import { fetchUserPosition, type KaminoPositionData } from "@/lib/solana/kamino";
import {
  calculateDistanceToLiquidation,
  calculateVolatilityScore,
} from "@/lib/risk/metrics";

const MOCK_POSITION: PositionSnapshot = {
  collateralAsset: "SOL",
  debtAsset: "USDC",
  collateralValueUsd: 5200,
  debtValueUsd: 3800,
  ltv: 73.1,
  healthFactor: 1.14,
  liquidationThreshold: 80,
  distanceToLiquidation: 8.6,
  availableBufferUsd: 250,
  oracleConfidence: 0.95,
  volatilityScore: 0.6,
  timestamp: Date.now(),
};

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
  if (useMock) return MOCK_POSITION;

  const position = await fetchUserPosition(walletAddress);
  if (!position) return MOCK_POSITION;

  return toSnapshot(position);
}
