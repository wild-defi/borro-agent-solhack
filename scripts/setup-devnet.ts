/**
 * One-time setup: create a Policy + DecisionLog on devnet.
 *
 * Usage:
 *   npx tsx scripts/setup-devnet.ts
 *
 * Requires:
 *   - programs/borro-guard/tests/fixtures/localnet-wallet.json (agent keypair)
 *   - Borro Guard deployed on devnet
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey(
  "7XZ4WDsPMAiJwVGpt52QVk69mQ5HqjcMcobwEyh4s9gv"
);
const RPC_URL = "https://api.devnet.solana.com";

const POLICY_SEED = "policy";
const DECISION_LOG_SEED = "decision_log";

const ACTION_DO_NOTHING = 1 << 0;
const ACTION_REPAY_FROM_BUFFER = 1 << 1;

async function main() {
  // Load agent keypair
  const walletPath = path.resolve(
    __dirname,
    "../programs/borro-guard/tests/fixtures/localnet-wallet.json"
  );
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const owner = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  console.log("Owner:", owner.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(owner.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");

  // Use a fixed mock obligation for demo
  const kaminoObligation = PublicKey.default; // 11111...
  const bufferMint = PublicKey.default;

  // Derive PDAs
  const [policyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(POLICY_SEED),
      owner.publicKey.toBuffer(),
      kaminoObligation.toBuffer(),
    ],
    PROGRAM_ID
  );

  const [decisionLogPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(DECISION_LOG_SEED), policyPda.toBuffer()],
    PROGRAM_ID
  );

  console.log("Policy PDA:", policyPda.toBase58());
  console.log("Decision Log PDA:", decisionLogPda.toBase58());

  // Check if policy already exists
  const existing = await connection.getAccountInfo(policyPda);
  if (existing) {
    console.log("\nPolicy already exists! Skipping creation.");
    printEnvVars(owner, policyPda);
    return;
  }

  // Build provider
  const wallet = new anchor.Wallet(owner);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load IDL
  const idlPath = path.resolve(
    __dirname,
    "../programs/borro-guard/target/idl/borro_guard.json"
  );
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // Initialize policy
  console.log("\nCreating policy on devnet...");
  const tx = await program.methods
    .initializePolicy({
      kaminoObligation,
      bufferMint,
      agentAuthority: owner.publicKey, // agent = owner for demo
      riskProfile: 1, // balanced
      allowedActions: ACTION_DO_NOTHING | ACTION_REPAY_FROM_BUFFER,
      targetHealthFactorBps: 13000, // 1.30
      maxRepayPerActionUsd: new anchor.BN(500),
      maxDailyInterventionUsd: new anchor.BN(2000),
      cooldownSeconds: 60,
      isEnabled: true,
    })
    .accountsPartial({
      owner: owner.publicKey,
      bufferMint,
      policy: policyPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Policy created! TX:", tx);
  console.log(`https://solscan.io/tx/${tx}?cluster=devnet`);

  printEnvVars(owner, policyPda);
}

function printEnvVars(owner: Keypair, policyPda: PublicKey) {
  const secretKeyJson = JSON.stringify(Array.from(owner.secretKey));
  console.log("\n--- Add to .env.local ---");
  console.log(`AGENT_SECRET_KEY=${secretKeyJson}`);
  console.log(`BORRO_POLICY_ADDRESS=${policyPda.toBase58()}`);
  console.log(`EXECUTION_MODE=record_only`);
}

main().catch(console.error);
