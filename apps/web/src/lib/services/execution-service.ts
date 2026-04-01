import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  DecisionValidationResult,
  ValidationContext,
} from "@/lib/risk/validation";
import { validateAIDecision } from "@/lib/risk/validation";
import { KAMINO_MAIN_MARKET_ADDRESS } from "@/lib/solana/kamino";
import { getAgentPublicKey, recordDecisionOnChain } from "@/lib/solana/borro-program";
import type {
  AIDecision,
  ExecutionMode,
  ExecutionRecord,
  Policy,
  PositionSnapshot,
} from "@/lib/types";

const SUPPORTED_ACTION = "REPAY_FROM_BUFFER";
const SUPPORTED_MODES: ExecutionMode[] = ["mock", "record_only", "kamino_repay"];

interface ExecuteDecisionParams {
  snapshot: PositionSnapshot;
  policy?: Partial<Policy>;
  decision: AIDecision;
  ownerAddress?: string;
  policyAddress?: string;
  forceMode?: ExecutionMode;
  validationContext?: ValidationContext;
}

export interface ExecuteDecisionResult {
  validation: DecisionValidationResult;
  execution: ExecutionRecord;
}

function getExecutionMode(forceMode?: ExecutionMode): ExecutionMode {
  const configuredMode = forceMode ?? process.env.EXECUTION_MODE ?? "mock";

  if (SUPPORTED_MODES.includes(configuredMode as ExecutionMode)) {
    return configuredMode as ExecutionMode;
  }

  return "mock";
}

function roundUsd(value: number): number {
  return Number(Math.max(0, value).toFixed(2));
}

function estimateHealthFactorAfterRepay(
  snapshot: PositionSnapshot,
  executedAmountUsd: number
): number {
  const borrowLimitUsd =
    snapshot.collateralValueUsd * (snapshot.liquidationThreshold / 100);
  const remainingDebtUsd = Math.max(0, snapshot.debtValueUsd - executedAmountUsd);

  if (remainingDebtUsd <= 0) {
    return 999;
  }

  return Number((borrowLimitUsd / remainingDebtUsd).toFixed(2));
}

function buildExecutionRecord(
  mode: ExecutionMode,
  snapshot: PositionSnapshot,
  decision: AIDecision,
  overrides: Partial<ExecutionRecord>
): ExecutionRecord {
  return {
    decisionId: randomUUID(),
    action: decision.action,
    mode,
    requestedAmountUsd: roundUsd(decision.repayAmountUsd),
    executedAmountUsd: 0,
    status: "pending",
    txSignature: null,
    logTxSignature: null,
    policyAddress: null,
    decisionLogAddress: null,
    healthFactorBefore: snapshot.healthFactor,
    healthFactorAfter: snapshot.healthFactor,
    timestamp: Date.now(),
    reason: decision.reason,
    ...overrides,
  };
}

function getRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com"
  );
}

function getClusterEnv(): "devnet" | "mainnet-beta" {
  const cluster = process.env.NEXT_PUBLIC_CLUSTER?.trim();

  if (cluster === "devnet" || cluster === "mainnet-beta") {
    return cluster;
  }

  return getRpcUrl().includes("devnet") ? "devnet" : "mainnet-beta";
}

function requireAgentWalletMatch(ownerAddress?: string) {
  const agentPublicKey = getAgentPublicKey();

  if (ownerAddress && ownerAddress !== agentPublicKey) {
    throw new Error(
      "kamino_repay mode currently requires the monitored wallet to match the agent signer. Use a dedicated demo wallet or switch to mock/record_only."
    );
  }
}

async function writeAgentKeypairFile(): Promise<string> {
  const secretKey = process.env.AGENT_SECRET_KEY;

  if (!secretKey) {
    throw new Error("AGENT_SECRET_KEY must be set for kamino_repay mode.");
  }

  const keypairFile = path.join(
    os.tmpdir(),
    `borro-agent-${Date.now()}-${Math.round(Math.random() * 1_000_000)}.json`
  );
  const bytes = secretKey.trim().startsWith("[")
    ? (JSON.parse(secretKey) as number[])
    : Array.from((await import("bs58")).default.decode(secretKey.trim()));

  await writeFile(keypairFile, JSON.stringify(bytes), "utf8");
  return keypairFile;
}

async function executeKaminoRepay(
  snapshot: PositionSnapshot,
  repayAmountUsd: number,
  ownerAddress?: string
): Promise<string> {
  requireAgentWalletMatch(ownerAddress);

  const debtAsset = snapshot.debtAsset.toUpperCase();
  const keypairFile = await writeAgentKeypairFile();

  try {
    const [
      { address },
      cliEnvModule,
      marketService,
      actionModule,
      obligationModule,
      txModule,
    ] =
      await Promise.all([
        import("@solana/kit"),
        import("@kamino-finance/klend-sdk/dist/client/tx/CliEnv.js"),
        import("@kamino-finance/klend-sdk/dist/client/services/market.js"),
        import("@kamino-finance/klend-sdk/dist/classes/action.js"),
        import("@kamino-finance/klend-sdk/dist/utils/ObligationType.js"),
        import("@kamino-finance/klend-sdk/dist/client/tx/tx.js"),
      ]);

    const env = await cliEnvModule.initEnv(
      cliEnvModule.parseEnv(getClusterEnv()),
      keypairFile,
      false,
      undefined,
      getRpcUrl()
    );
    const signer = await env.getSigner();
    const marketAddress = address(
      process.env.KAMINO_MARKET_ADDRESS ?? KAMINO_MAIN_MARKET_ADDRESS
    );
    const kaminoMarket = await marketService.getMarket(
      env.c.rpc,
      marketAddress,
      env.klendProgramId
    );
    await kaminoMarket.loadReserves();

    const reserve = kaminoMarket.getReserveBySymbol(debtAsset);
    if (!reserve) {
      throw new Error(`Kamino reserve for ${debtAsset} was not found.`);
    }

    const repayAmountAtomic = Math.round(
      repayAmountUsd * Math.pow(10, reserve.getMintDecimals())
    );

    if (repayAmountAtomic <= 0) {
      throw new Error("Repay amount is too small after token conversion.");
    }

    const currentSlot = await env.c.rpc.getSlot().send();
    const kaminoAction = await actionModule.KaminoAction.buildRepayTxns(
      kaminoMarket,
      repayAmountAtomic.toString(),
      reserve.getLiquidityMint(),
      signer,
      new obligationModule.VanillaObligation(marketAddress),
      true,
      undefined,
      currentSlot
    );

    const signature = await txModule.sendAndConfirmTx(
      env.c,
      signer,
      actionModule.KaminoAction.actionToIxs(kaminoAction)
    );

    return signature.toString();
  } finally {
    await unlink(keypairFile).catch(() => undefined);
  }
}

async function attachDecisionLog(
  policyAddress: string | undefined,
  decision: AIDecision,
  requestedAmountUsd: number,
  executedAmountUsd: number,
  txSignature: string
) {
  if (!policyAddress) {
    return null;
  }

  return recordDecisionOnChain({
    policyAddress,
    decision,
    requestedAmountUsd,
    executedAmountUsd,
    txSignature,
  });
}

export async function executeDecision(
  params: ExecuteDecisionParams
): Promise<ExecuteDecisionResult> {
  const mode = getExecutionMode(params.forceMode);
  const validation = validateAIDecision(
    params.snapshot,
    params.policy,
    params.decision,
    params.validationContext
  );
  const validatedDecision = validation.validatedDecision;
  const baseRecord = buildExecutionRecord(mode, params.snapshot, validatedDecision, {
    requestedAmountUsd: roundUsd(validatedDecision.repayAmountUsd),
  });

  if (validatedDecision.action !== SUPPORTED_ACTION) {
    return {
      validation,
      execution: {
        ...baseRecord,
        status: "rejected",
        reason:
          validation.reasons[0] ??
          "Validated decision did not require REPAY_FROM_BUFFER execution.",
      },
    };
  }

  const requestedAmountUsd = roundUsd(validatedDecision.repayAmountUsd);

  try {
    if (mode === "mock") {
      return {
        validation,
        execution: {
          ...baseRecord,
          status: "simulated",
          executedAmountUsd: requestedAmountUsd,
          healthFactorAfter: estimateHealthFactorAfterRepay(
            params.snapshot,
            requestedAmountUsd
          ),
          reason:
            "Simulated REPAY_FROM_BUFFER execution completed. No on-chain transaction was sent in mock mode.",
        },
      };
    }

    if (mode === "record_only") {
      if (!params.policyAddress) {
        throw new Error(
          "record_only mode requires BORRO_POLICY_ADDRESS or policyAddress in the request."
        );
      }

      const log = await attachDecisionLog(
        params.policyAddress,
        validatedDecision,
        requestedAmountUsd,
        0,
        "record_only"
      );

      return {
        validation,
        execution: {
          ...baseRecord,
          status: "logged",
          executedAmountUsd: requestedAmountUsd,
          healthFactorAfter: estimateHealthFactorAfterRepay(
            params.snapshot,
            requestedAmountUsd
          ),
          policyAddress: log?.policyAddress ?? params.policyAddress,
          decisionLogAddress: log?.decisionLogAddress ?? null,
          logTxSignature: log?.txSignature ?? null,
          reason:
            "Decision was recorded on-chain. Projected health factor reflects estimated improvement from repay.",
        },
      };
    }

    const repayTxSignature = await executeKaminoRepay(
      params.snapshot,
      requestedAmountUsd,
      params.ownerAddress
    );

    let logTxSignature: string | null = null;
    let decisionLogAddress: string | null = null;
    let policyAddress = params.policyAddress ?? null;
    let loggingNote = "";

    if (params.policyAddress) {
      try {
        const log = await attachDecisionLog(
          params.policyAddress,
          validatedDecision,
          requestedAmountUsd,
          requestedAmountUsd,
          repayTxSignature
        );
        logTxSignature = log?.txSignature ?? null;
        decisionLogAddress = log?.decisionLogAddress ?? null;
        policyAddress = log?.policyAddress ?? params.policyAddress;
      } catch (error) {
        loggingNote = ` Decision logging failed: ${
          error instanceof Error ? error.message : "Unknown logging error"
        }`;
      }
    }

    return {
      validation,
      execution: {
        ...baseRecord,
        status: "success",
        executedAmountUsd: requestedAmountUsd,
        txSignature: repayTxSignature,
        logTxSignature,
        decisionLogAddress,
        policyAddress,
        healthFactorAfter: estimateHealthFactorAfterRepay(
          params.snapshot,
          requestedAmountUsd
        ),
        reason: `Kamino repay executed successfully.${loggingNote}`.trim(),
      },
    };
  } catch (error) {
    return {
      validation,
      execution: {
        ...baseRecord,
        status: "failed",
        reason:
          error instanceof Error
            ? error.message
            : "Unknown execution service error",
      },
    };
  }
}
