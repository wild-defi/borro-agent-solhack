import type { PositionSnapshot } from "@/lib/types";
import { fetchUserPosition, type KaminoPositionData } from "@/lib/solana/kamino";
import { fetchSolMarketSignals } from "@/lib/services/market-data";
import {
  calculateDistanceToLiquidation,
} from "@/lib/risk/metrics";

const DEMO_OBLIGATION_ADDRESS = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";

const MOCK_POSITION_BASE = {
  collateralValueUsd: 4900,
  debtValueUsd: 3800,
  oracleConfidence: 0.89,
  oracleConfidenceRatio: 0.0015,
  solPriceChange24h: 0,
  fearGreedValue: 50,
  fearGreedClassification: "Neutral",
  availableBufferUsd: 0,
};

async function getMockPosition(): Promise<PositionSnapshot> {
  const s = MOCK_POSITION_BASE;
  const liquidationThreshold = 80;
  const ltv = Number(((s.debtValueUsd / s.collateralValueUsd) * 100).toFixed(2));
  const healthFactor = Number((liquidationThreshold / ltv).toFixed(2));
  const distanceToLiquidation = Number(
    (((liquidationThreshold - ltv) / liquidationThreshold) * 100).toFixed(2)
  );
  const marketSignals = await fetchSolMarketSignals(distanceToLiquidation, {
    oracleConfidence: s.oracleConfidence,
    oracleConfidenceRatio: s.oracleConfidenceRatio,
    solPriceChange24h: s.solPriceChange24h,
    fearGreedValue: s.fearGreedValue,
    fearGreedClassification: s.fearGreedClassification,
  });

  return {
    obligationAddress: DEMO_OBLIGATION_ADDRESS,
    collateralAsset: "SOL",
    debtAsset: "USDC",
    collateralValueUsd: s.collateralValueUsd,
    debtValueUsd: s.debtValueUsd,
    ltv,
    healthFactor,
    liquidationThreshold,
    distanceToLiquidation,
    availableBufferUsd: s.availableBufferUsd,
    oracleConfidence: marketSignals.oracleConfidence,
    oracleConfidenceRatio: marketSignals.oracleConfidenceRatio,
    solPriceChange24h: marketSignals.solPriceChange24h,
    fearGreedValue: marketSignals.fearGreedValue,
    fearGreedClassification: marketSignals.fearGreedClassification,
    volatilityScore: marketSignals.volatilityScore,
    timestamp: Date.now(),
  };
}

async function toSnapshot(
  data: KaminoPositionData,
  walletAddress: string
): Promise<PositionSnapshot> {
  const distanceToLiquidation = calculateDistanceToLiquidation(
    data.ltv,
    data.liquidationThreshold
  );
  const marketSignals = await fetchSolMarketSignals(distanceToLiquidation, {
    oracleConfidence: 0.95,
    oracleConfidenceRatio: 0.001,
    solPriceChange24h: 0,
    fearGreedValue: 50,
    fearGreedClassification: "Neutral",
  });

  return {
    ...data,
    obligationAddress: data.obligationAddress ?? walletAddress,
    distanceToLiquidation,
    availableBufferUsd: 0, // will be filled from buffer vault later
    oracleConfidence: marketSignals.oracleConfidence,
    oracleConfidenceRatio: marketSignals.oracleConfidenceRatio,
    solPriceChange24h: marketSignals.solPriceChange24h,
    fearGreedValue: marketSignals.fearGreedValue,
    fearGreedClassification: marketSignals.fearGreedClassification,
    volatilityScore: marketSignals.volatilityScore,
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

  return toSnapshot(position, walletAddress);
}
