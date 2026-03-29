import { NextRequest, NextResponse } from "next/server";

import { getAIDecision } from "@/lib/ai/client";
import { getPositionSnapshot } from "@/lib/services/position-service";
import { executeDecision } from "@/lib/services/execution-service";
import type { AIDecision, ExecutionMode, Policy, PositionSnapshot } from "@/lib/types";

interface ExecuteRequestBody {
  wallet?: string;
  mock?: boolean;
  snapshot?: PositionSnapshot;
  decision?: AIDecision;
  policy?: Partial<Policy>;
  policyAddress?: string;
  forceMock?: boolean;
  forceMode?: ExecutionMode;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExecuteRequestBody;

    const snapshot =
      body.snapshot ??
      (body.wallet
        ? await getPositionSnapshot(body.wallet, body.mock ?? false)
        : null);

    if (!snapshot) {
      return NextResponse.json(
        { error: "snapshot or wallet is required" },
        { status: 400 }
      );
    }

    const rawDecision =
      body.decision ??
      (await getAIDecision(snapshot, body.policy, {
        forceMock: body.forceMock,
      }));
    const result = await executeDecision({
      snapshot,
      policy: body.policy,
      decision: rawDecision,
      ownerAddress: body.wallet,
      policyAddress: body.policyAddress ?? process.env.BORRO_POLICY_ADDRESS,
      forceMode: body.forceMode,
    });

    return NextResponse.json({
      snapshot,
      rawDecision,
      validation: result.validation,
      execution: result.execution,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown execute route error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
