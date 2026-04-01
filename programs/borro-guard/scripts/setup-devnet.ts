/**
 * One-time setup: create a Policy + DecisionLog on devnet.
 *
 * Usage (from programs/borro-guard/):
 *   ./node_modules/.bin/tsx scripts/setup-devnet.ts
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import type { BorroGuard } from "../target/types/borro_guard";

const RPC_URL = "https://api.devnet.solana.com";

const POLICY_SEED = "policy";

const ACTION_DO_NOTHING = 1 << 0;
const ACTION_REPAY_FROM_BUFFER = 1 << 1;

async function main() {
  const walletPath = path.resolve(
    __dirname,
    "../tests/fixtures/localnet-wallet.json"
  );
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const owner = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  console.log("Owner:", owner.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(owner.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");

  // Load IDL with types for Anchor 0.32
  const idlPath = path.resolve(
    __dirname,
    "../target/idl/borro_guard.json"
  );
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);

  const kaminoObligation = PublicKey.default;
  const bufferMint = PublicKey.default;

  const [policyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(POLICY_SEED),
      owner.publicKey.toBuffer(),
      kaminoObligation.toBuffer(),
    ],
    programId
  );

  console.log("Policy PDA:", policyPda.toBase58());

  const existing = await connection.getAccountInfo(policyPda);
  if (existing) {
    console.log("\nPolicy already exists! Skipping creation.");
    printEnvVars(owner, policyPda);
    return;
  }

  const wallet = new anchor.Wallet(owner);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Anchor 0.32: new Program<IDLType>(idl, provider)
  const program = new anchor.Program<BorroGuard>(idl as BorroGuard, provider);

  console.log("\nCreating policy on devnet...");
  const tx = await program.methods
    .initializePolicy({
      kaminoObligation,
      bufferMint,
      agentAuthority: owner.publicKey,
      riskProfile: 1,
      allowedActions: ACTION_DO_NOTHING | ACTION_REPAY_FROM_BUFFER,
      targetHealthFactorBps: 13000,
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
