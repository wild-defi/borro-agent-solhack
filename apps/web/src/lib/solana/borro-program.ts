import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import bs58 from "bs58";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";

import type { AIDecision } from "@/lib/types";

const POLICY_SEED = "policy";
const DECISION_LOG_SEED = "decision_log";

const ACTION_MASKS = {
  DO_NOTHING: 1 << 0,
  REPAY_FROM_BUFFER: 1 << 1,
  REPAY_WITH_COLLATERAL: 1 << 2,
  PARTIAL_DELEVERAGE: 1 << 3,
} as const;

const IDL_CANDIDATES = [
  path.resolve(process.cwd(), "programs/borro-guard/target/idl/borro_guard.json"),
  path.resolve(process.cwd(), "../../programs/borro-guard/target/idl/borro_guard.json"),
];

let idlCache: Idl | null = null;

function getRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    clusterApiUrl("devnet")
  );
}

async function resolveIdlPath(): Promise<string> {
  for (const candidate of IDL_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Borro IDL file was not found. Build the Anchor program first.");
}

async function loadIdl(): Promise<Idl> {
  if (idlCache) {
    return idlCache;
  }

  const idlPath = await resolveIdlPath();
  const raw = await readFile(idlPath, "utf8");
  idlCache = JSON.parse(raw) as Idl;
  return idlCache;
}

function parseSecretKey(secretKey: string): Uint8Array {
  const trimmed = secretKey.trim();

  if (!trimmed) {
    throw new Error("AGENT_SECRET_KEY is empty.");
  }

  if (trimmed.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmed) as number[]);
  }

  return Uint8Array.from(bs58.decode(trimmed));
}

function getAgentKeypair(): Keypair {
  const secretKey = process.env.AGENT_SECRET_KEY;

  if (!secretKey) {
    throw new Error("AGENT_SECRET_KEY must be set for Borro execution.");
  }

  return Keypair.fromSecretKey(parseSecretKey(secretKey));
}

async function getProgram(): Promise<{
  program: Program<Idl>;
  provider: AnchorProvider;
  wallet: {
    publicKey: PublicKey;
    signTransaction: <T extends Transaction | VersionedTransaction>(
      transaction: T
    ) => Promise<T>;
    signAllTransactions: <T extends Transaction | VersionedTransaction>(
      transactions: T[]
    ) => Promise<T[]>;
  };
}> {
  const [idl, agent] = await Promise.all([loadIdl(), Promise.resolve(getAgentKeypair())]);
  const connection = new Connection(getRpcUrl(), "confirmed");
  const wallet = {
    publicKey: agent.publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(
      transaction: T
    ): Promise<T> {
      if ("version" in transaction) {
        transaction.sign([agent]);
      } else {
        transaction.partialSign(agent);
      }

      return transaction;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(
      transactions: T[]
    ): Promise<T[]> {
      transactions.forEach((transaction) => {
        if ("version" in transaction) {
          transaction.sign([agent]);
        } else {
          transaction.partialSign(agent);
        }
      });

      return transactions;
    },
  };
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const programId = new PublicKey(
    process.env.BORRO_PROGRAM_ID ??
      process.env.NEXT_PUBLIC_BORRO_PROGRAM_ID ??
      (idl as Idl & { address?: string }).address ??
      ""
  );
  const program = new Program(idl, programId, provider);

  return { program, provider, wallet };
}

export function actionToMask(action: AIDecision["action"]): number {
  return ACTION_MASKS[action];
}

export function toBps(value: number): number {
  return Math.round(value * 10_000);
}

export function toUsdInteger(value: number): number {
  return Math.max(0, Math.round(value));
}

export async function derivePolicyPda(
  owner: string | PublicKey,
  obligation: string | PublicKey
): Promise<[PublicKey, number]> {
  const { program } = await getProgram();

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(POLICY_SEED),
      new PublicKey(owner).toBuffer(),
      new PublicKey(obligation).toBuffer(),
    ],
    program.programId
  );
}

export async function deriveDecisionLogPda(
  policyAddress: string | PublicKey
): Promise<[PublicKey, number]> {
  const { program } = await getProgram();

  return PublicKey.findProgramAddressSync(
    [Buffer.from(DECISION_LOG_SEED), new PublicKey(policyAddress).toBuffer()],
    program.programId
  );
}

export interface RecordDecisionOnChainInput {
  policyAddress: string;
  decision: AIDecision;
  requestedAmountUsd: number;
  executedAmountUsd: number;
  txSignature: string;
}

export async function recordDecisionOnChain(input: RecordDecisionOnChainInput) {
  const { program, wallet } = await getProgram();
  const policy = new PublicKey(input.policyAddress);
  const [decisionLog] = await deriveDecisionLogPda(policy);

  const signature = await program.methods
    .recordDecision({
      action: actionToMask(input.decision.action),
      requestedAmountUsd: new BN(toUsdInteger(input.requestedAmountUsd)),
      executedAmountUsd: new BN(toUsdInteger(input.executedAmountUsd)),
      targetHealthFactorBps: toBps(input.decision.targetHealthFactor),
      confidenceBps: toBps(input.decision.confidence),
      reason: input.decision.reason.slice(0, 160),
      txSignature: input.txSignature.slice(0, 88),
    })
    .accounts({
      authority: wallet.publicKey,
      policy,
      decisionLog,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    policyAddress: policy.toBase58(),
    decisionLogAddress: decisionLog.toBase58(),
    txSignature: signature,
  };
}

export function getAgentPublicKey(): string {
  return getAgentKeypair().publicKey.toBase58();
}
