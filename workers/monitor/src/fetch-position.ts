import { Connection, PublicKey } from "@solana/web3.js";

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

const MOCK_SCENARIO = {
  label: "CRITICAL — near liquidation",
  collateralValueUsd: 4900,
  debtValueUsd: 3800,
  oracleConfidence: 0.89,
  availableBufferUsd: 300,
};

export async function fetchPosition(
  _connection: Connection,
  _wallet: PublicKey
): Promise<PositionSnapshot> {
  const scenario = MOCK_SCENARIO;

  const liquidationThreshold = 80;
  const ltv = Number(((scenario.debtValueUsd / scenario.collateralValueUsd) * 100).toFixed(2));
  const healthFactor = Number((liquidationThreshold / ltv).toFixed(2));
  const distanceToLiquidation = Number((((liquidationThreshold - ltv) / liquidationThreshold) * 100).toFixed(2));

  console.log(`[monitor] scenario: ${scenario.label}`);

  return {
    collateralAsset: "SOL",
    debtAsset: "USDC",
    collateralValueUsd: scenario.collateralValueUsd,
    debtValueUsd: scenario.debtValueUsd,
    ltv,
    healthFactor,
    liquidationThreshold,
    distanceToLiquidation,
    availableBufferUsd: scenario.availableBufferUsd,
    oracleConfidence: scenario.oracleConfidence,
    volatilityScore: Number((1 - scenario.oracleConfidence + (ltv > 70 ? 0.3 : 0)).toFixed(2)),
    timestamp: Date.now(),
  };
}
