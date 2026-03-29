import type { WorkerDecision, WorkerPolicy } from "./decide";
import type { PositionSnapshot } from "./fetch-position";

export interface ExecuteApiResponse {
  execution: {
    decisionId: string;
    action: string;
    mode: string;
    requestedAmountUsd: number;
    executedAmountUsd: number;
    status: string;
    txSignature: string | null;
    logTxSignature?: string | null;
    policyAddress?: string | null;
    decisionLogAddress?: string | null;
    healthFactorBefore?: number;
    healthFactorAfter?: number;
    timestamp: number;
    reason: string;
  };
  validation: {
    approved: boolean;
    wasModified: boolean;
    reasons: string[];
    validatedDecision: WorkerDecision;
  };
}

interface ExecuteParams {
  wallet: string;
  snapshot: PositionSnapshot;
  policy: WorkerPolicy;
  decision: WorkerDecision;
}

export async function executeDecision(params: ExecuteParams): Promise<ExecuteApiResponse> {
  const apiBaseUrl = process.env.BORRO_API_URL ?? "http://localhost:3000";
  const response = await fetch(`${apiBaseUrl}/api/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      wallet: params.wallet,
      snapshot: params.snapshot,
      policy: params.policy,
      decision: params.decision,
      policyAddress: process.env.BORRO_POLICY_ADDRESS,
      forceMode: process.env.EXECUTION_MODE,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Execute API failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as ExecuteApiResponse;
}
