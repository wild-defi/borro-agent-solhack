import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";

import { fetchPosition } from "./fetch-position";
import { buildSnapshot } from "./build-snapshot";
import { decide } from "./decide";
import { executeDecision } from "./execute";
import { validateDecision } from "./validate";

const INTERVAL_MS = 60_000; // 1 minute
const DEFAULT_WALLET =
  process.env.MONITOR_WALLET ?? "11111111111111111111111111111111";
const connection = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  "confirmed"
);

async function monitorLoop() {
  console.log("[monitor] checking positions...");

  const wallet = new PublicKey(DEFAULT_WALLET);
  const rawSnapshot = await fetchPosition(connection, wallet);
  const snapshot = buildSnapshot(rawSnapshot);
  const policy = {
    targetHealthFactor: 1.25,
    maxRepayPerActionUsd: 500,
    allowedActions: ["DO_NOTHING", "REPAY_FROM_BUFFER"],
    riskProfile: "balanced" as const,
    cooldownSeconds: 300,
    maxDailyInterventionUsd: 1500,
    enabled: true,
  };
  const decision = await decide(snapshot, policy);
  const validation = validateDecision(snapshot, policy, decision);

  console.log("[monitor] snapshot:", snapshot);
  console.log("[monitor] raw decision:", decision);
  console.log("[monitor] validated decision:", validation.validatedDecision);
  console.log("[monitor] validation:", validation);

  if (validation.validatedDecision.action === "REPAY_FROM_BUFFER") {
    try {
      const execution = await executeDecision({
        wallet: wallet.toBase58(),
        snapshot,
        policy,
        decision,
      });

      console.log("[monitor] execution:", execution.execution);
    } catch (error) {
      console.error("[monitor] execution failed:", error);
    }
  } else {
    console.log("[monitor] no execution required this cycle");
  }
}

async function main() {
  console.log("[monitor] Borro Agent monitor started");
  console.log(`[monitor] interval: ${INTERVAL_MS / 1000}s`);

  // Run once immediately
  await monitorLoop();

  // Then on interval
  setInterval(monitorLoop, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[monitor] fatal error:", err);
  process.exit(1);
});
