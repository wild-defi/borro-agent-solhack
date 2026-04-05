import { HermesClient } from "@pythnetwork/hermes-client";
import { calculateVolatilityScore } from "@/lib/risk/metrics";

const PYTH_HERMES_URL = process.env.PYTH_HERMES_URL ?? "https://hermes.pyth.network";
const COINGECKO_SIMPLE_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true";
const FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=1&format=json";

const DEFAULT_ORACLE_CONFIDENCE = 0.89;
const DEFAULT_ORACLE_CONFIDENCE_RATIO = 0.0015;
const DEFAULT_SOL_PRICE_CHANGE_24H = 0;
const DEFAULT_FEAR_GREED_VALUE = 50;
const DEFAULT_FEAR_GREED_CLASSIFICATION = "Neutral";

interface MarketSignalFallbacks {
  oracleConfidence?: number;
  oracleConfidenceRatio?: number;
  solPriceChange24h?: number;
  fearGreedValue?: number;
  fearGreedClassification?: string;
}

export interface SolMarketSignals {
  oracleConfidence: number;
  oracleConfidenceRatio: number;
  solPriceChange24h: number;
  fearGreedValue: number;
  fearGreedClassification: string;
  volatilityScore: number;
}

let hermesClient: HermesClient | null = null;
let solUsdFeedIdPromise: Promise<string | null> | null = null;

function getHermesClient() {
  if (!hermesClient) {
    hermesClient = new HermesClient(PYTH_HERMES_URL, {
      timeout: 3500,
      httpRetries: 1,
    });
  }

  return hermesClient;
}

function normalizeOracleConfidence(confidenceRatio: number) {
  const normalized = 1 - Math.min(confidenceRatio / 0.02, 1);
  return Number(Math.max(0, normalized).toFixed(2));
}

function toPythNumber(value: string, exponent: number) {
  return Number((Number(value) * 10 ** exponent).toFixed(8));
}

async function resolveSolUsdFeedId() {
  if (process.env.PYTH_SOL_USD_PRICE_ID) {
    return process.env.PYTH_SOL_USD_PRICE_ID;
  }

  if (!solUsdFeedIdPromise) {
    solUsdFeedIdPromise = (async () => {
      try {
        const feeds = await getHermesClient().getPriceFeeds({
          query: "SOL/USD",
          assetType: "crypto",
          fetchOptions: {
            signal: AbortSignal.timeout(3500),
          },
        });

        const match =
          feeds.find((feed) => {
            const attributes = Object.values(feed.attributes ?? {})
              .join(" ")
              .toUpperCase();
            return attributes.includes("SOL") && attributes.includes("USD");
          }) ?? feeds[0];

        return match?.id ?? null;
      } catch (error) {
        console.warn("Failed to resolve SOL/USD Pyth feed id:", error);
        return null;
      }
    })();
  }

  return solUsdFeedIdPromise;
}

async function fetchPythConfidenceSignal() {
  const priceFeedId = await resolveSolUsdFeedId();
  if (!priceFeedId) {
    return null;
  }

  try {
    const latestUpdate = await getHermesClient().getLatestPriceUpdates(
      [priceFeedId],
      { parsed: true },
      { signal: AbortSignal.timeout(3500) }
    );

    const parsedUpdate = latestUpdate.parsed?.[0];
    if (!parsedUpdate?.price) {
      return null;
    }

    const priceUsd = toPythNumber(
      parsedUpdate.price.price,
      parsedUpdate.price.expo
    );
    const confidenceUsd = toPythNumber(
      parsedUpdate.price.conf,
      parsedUpdate.price.expo
    );

    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return null;
    }

    const confidenceRatio = Number(
      (confidenceUsd / priceUsd).toFixed(6)
    );

    return {
      oracleConfidence: normalizeOracleConfidence(confidenceRatio),
      oracleConfidenceRatio: confidenceRatio,
    };
  } catch (error) {
    console.warn("Failed to fetch Pyth confidence signal:", error);
    return null;
  }
}

async function fetchCoinGeckoSolChange24h() {
  try {
    const response = await fetch(COINGECKO_SIMPLE_PRICE_URL, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      throw new Error(`CoinGecko responded with ${response.status}`);
    }

    const payload = (await response.json()) as {
      solana?: { usd_24h_change?: number };
    };

    const change24h = payload.solana?.usd_24h_change;
    if (typeof change24h !== "number" || Number.isNaN(change24h)) {
      return null;
    }

    return Number(change24h.toFixed(2));
  } catch (error) {
    console.warn("Failed to fetch CoinGecko 24h SOL change:", error);
    return null;
  }
}

async function fetchFearAndGreedSignal() {
  try {
    const response = await fetch(FEAR_GREED_URL, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      throw new Error(`Fear & Greed API responded with ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{
        value?: string;
        value_classification?: string;
      }>;
    };

    const latest = payload.data?.[0];
    const value = Number(latest?.value);
    if (!Number.isFinite(value)) {
      return null;
    }

    return {
      fearGreedValue: Number(value.toFixed(0)),
      fearGreedClassification:
        latest?.value_classification?.trim() || DEFAULT_FEAR_GREED_CLASSIFICATION,
    };
  } catch (error) {
    console.warn("Failed to fetch Fear & Greed Index:", error);
    return null;
  }
}

export async function fetchSolMarketSignals(
  distanceToLiquidation: number,
  fallbacks: MarketSignalFallbacks = {}
): Promise<SolMarketSignals> {
  const [
    pythSignalResult,
    solChangeResult,
    fearGreedResult,
  ] = await Promise.allSettled([
    fetchPythConfidenceSignal(),
    fetchCoinGeckoSolChange24h(),
    fetchFearAndGreedSignal(),
  ]);

  const oracleConfidence =
    pythSignalResult.status === "fulfilled" && pythSignalResult.value
      ? pythSignalResult.value.oracleConfidence
      : fallbacks.oracleConfidence ?? DEFAULT_ORACLE_CONFIDENCE;

  const oracleConfidenceRatio =
    pythSignalResult.status === "fulfilled" && pythSignalResult.value
      ? pythSignalResult.value.oracleConfidenceRatio
      : fallbacks.oracleConfidenceRatio ?? DEFAULT_ORACLE_CONFIDENCE_RATIO;

  const solPriceChange24h =
    solChangeResult.status === "fulfilled" && solChangeResult.value !== null
      ? solChangeResult.value
      : fallbacks.solPriceChange24h ?? DEFAULT_SOL_PRICE_CHANGE_24H;

  const fearGreedValue =
    fearGreedResult.status === "fulfilled" && fearGreedResult.value
      ? fearGreedResult.value.fearGreedValue
      : fallbacks.fearGreedValue ?? DEFAULT_FEAR_GREED_VALUE;

  const fearGreedClassification =
    fearGreedResult.status === "fulfilled" && fearGreedResult.value
      ? fearGreedResult.value.fearGreedClassification
      : fallbacks.fearGreedClassification ?? DEFAULT_FEAR_GREED_CLASSIFICATION;

  const volatilityScore = calculateVolatilityScore(
    oracleConfidence,
    distanceToLiquidation,
    solPriceChange24h,
    fearGreedValue
  );

  return {
    oracleConfidence,
    oracleConfidenceRatio,
    solPriceChange24h,
    fearGreedValue,
    fearGreedClassification,
    volatilityScore,
  };
}
