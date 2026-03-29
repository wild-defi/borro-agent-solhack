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

// Mock for now — will be replaced with real Kamino SDK calls
export async function fetchPosition(
  _connection: Connection,
  _wallet: PublicKey
): Promise<PositionSnapshot> {
  return {
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
}
