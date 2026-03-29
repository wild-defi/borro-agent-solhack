import { createSolanaRpc, address, type Rpc } from "@solana/kit";
import { KaminoMarket, type KaminoMarketRpcApi } from "@kamino-finance/klend-sdk";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const KAMINO_MAIN_MARKET_ADDRESS =
  "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";

const KAMINO_MAIN_MARKET = address(
  KAMINO_MAIN_MARKET_ADDRESS
);

let marketCache: KaminoMarket | null = null;

function getRpc(): Rpc<KaminoMarketRpcApi> {
  return createSolanaRpc(RPC_URL) as unknown as Rpc<KaminoMarketRpcApi>;
}

export async function getMarket(): Promise<KaminoMarket> {
  if (marketCache) return marketCache;
  const rpc = getRpc();
  const market = await KaminoMarket.load(rpc, KAMINO_MAIN_MARKET, 400);
  if (!market) throw new Error("Failed to load Kamino market");
  marketCache = market;
  return market;
}

export interface KaminoPositionData {
  collateralAsset: string;
  debtAsset: string;
  collateralValueUsd: number;
  debtValueUsd: number;
  ltv: number;
  healthFactor: number;
  liquidationThreshold: number;
}

export async function fetchUserPosition(
  walletAddress: string
): Promise<KaminoPositionData | null> {
  try {
    const market = await getMarket();
    await market.loadReserves();
    const obligations = await market.getAllUserObligations(
      address(walletAddress)
    );

    if (!obligations || obligations.length === 0) return null;

    const obligation = obligations.find(
      (o) => o.deposits.size > 0 && o.borrows.size > 0
    );

    if (!obligation) return null;

    const stats = obligation.refreshedStats;
    const depositValue = stats.userTotalDeposit.toNumber();
    const borrowValue = stats.userTotalBorrow.toNumber();
    const borrowLimitValue = stats.borrowLimit.toNumber();

    const ltv =
      borrowValue > 0 && depositValue > 0
        ? (borrowValue / depositValue) * 100
        : 0;

    const liquidationThreshold =
      borrowLimitValue > 0 && depositValue > 0
        ? (borrowLimitValue / depositValue) * 100
        : 80;

    const healthFactor =
      borrowValue > 0
        ? borrowLimitValue / borrowValue
        : 999;

    const firstDeposit = obligation.deposits.values().next().value;
    const firstBorrow = obligation.borrows.values().next().value;

    const collateralSymbol = firstDeposit?.reserveAddress
      ? market.getReserveByAddress(firstDeposit.reserveAddress)?.symbol ?? "SOL"
      : "SOL";

    const debtSymbol = firstBorrow?.reserveAddress
      ? market.getReserveByAddress(firstBorrow.reserveAddress)?.symbol ?? "USDC"
      : "USDC";

    return {
      collateralAsset: collateralSymbol,
      debtAsset: debtSymbol,
      collateralValueUsd: depositValue,
      debtValueUsd: borrowValue,
      ltv,
      healthFactor,
      liquidationThreshold,
    };
  } catch (err) {
    console.error("Failed to fetch Kamino position:", err);
    return null;
  }
}
