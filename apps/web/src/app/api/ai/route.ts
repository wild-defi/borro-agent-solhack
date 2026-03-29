import { NextRequest, NextResponse } from "next/server";

import { getAIDecision } from "@/lib/ai/client";
import { getPositionSnapshot } from "@/lib/services/position-service";
import { validateAIDecision } from "@/lib/risk/validation";
import type { Policy, PositionSnapshot } from "@/lib/types";

interface AIRequestBody {
  wallet?: string;
  mock?: boolean;
  snapshot?: PositionSnapshot;
  policy?: Partial<Policy>;
  forceMock?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIRequestBody;

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

    const rawDecision = await getAIDecision(snapshot, body.policy, {
      forceMock: body.forceMock,
    });
    const validation = validateAIDecision(snapshot, body.policy, rawDecision);

    return NextResponse.json({
      snapshot,
      rawDecision,
      validatedDecision: validation.validatedDecision,
      validation,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI route error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
