import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";

import { fetchPosition } from "./fetch-position";
import { buildSnapshot } from "./build-snapshot";
import { decide } from "./decide";
import { executeDecision } from "./execute";
import { validateDecision } from "./validate";

const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS ?? 30_000); // 30s default for demo
const DEFAULT_WALLET =
  process.env.MONITOR_WALLET ?? "11111111111111111111111111111111";
const connection = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  "confirmed"
);

async function monitorLoop() {
  const cycleStart = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log(`[monitor] cycle at ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  const wallet = new PublicKey(DEFAULT_WALLET);
  const rawSnapshot = await fetchPosition(connection, wallet);
  const snapshot = buildSnapshot(rawSnapshot);

  console.log(`[monitor] position: $${snapshot.collateralValueUsd} collateral / $${snapshot.debtValueUsd} debt`);
  console.log(`[monitor] HF: ${snapshot.healthFactor} | LTV: ${snapshot.ltv}% | Distance to liq: ${snapshot.distanceToLiquidation}%`);

  const policy = {
    targetHealthFactor: 1.25,
    maxRepayPerActionUsd: 500,
    allowedActions: ["DO_NOTHING", "REPAY_FROM_BUFFER"],
    riskProfile: "balanced" as const,
    cooldownSeconds: 60,
    maxDailyInterventionUsd: 1500,
    enabled: true,
  };

  console.log("[monitor] requesting AI decision...");
  const decision = await decide(snapshot, policy);
  console.log(`[monitor] AI says: ${decision.action} (confidence: ${decision.confidence})`);
  console.log(`[monitor] reason: ${decision.reason}`);

  const validation = validateDecision(snapshot, policy, decision);
  console.log(`[monitor] validation: ${validation.approved ? "✅ APPROVED" : "❌ REJECTED"} ${validation.wasModified ? "(modified)" : ""}`);
  if (validation.reasons.length > 0) {
    console.log(`[monitor] validation notes: ${validation.reasons.join("; ")}`);
  }

  if (validation.validatedDecision.action === "REPAY_FROM_BUFFER") {
    try {
      console.log(`[monitor] executing: repay $${validation.validatedDecision.repayAmountUsd} from buffer...`);
      const execution = await executeDecision({
        wallet: wallet.toBase58(),
        snapshot,
        policy,
        decision: validation.validatedDecision,
      });

      const ex = execution.execution;
      console.log(`[monitor] ✅ executed: $${ex.executedAmountUsd} | HF ${ex.healthFactorBefore} → ${ex.healthFactorAfter} | mode: ${ex.mode}`);
      if (ex.txSignature) console.log(`[monitor] tx: ${ex.txSignature}`);
      if (ex.logTxSignature) console.log(`[monitor] on-chain log: https://solscan.io/tx/${ex.logTxSignature}?cluster=devnet`);
    } catch (error) {
      console.error("[monitor] ❌ execution failed:", error);
    }
  } else {
    console.log("[monitor] → no action needed this cycle");
  }

  console.log(`[monitor] cycle done in ${Date.now() - cycleStart}ms`);
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
