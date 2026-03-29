import type { PositionSnapshot } from "./fetch-position";

export interface WorkerPolicy {
  targetHealthFactor: number;
  maxRepayPerActionUsd: number;
  allowedActions: string[];
  riskProfile?: "conservative" | "balanced" | "aggressive";
  cooldownSeconds?: number;
  maxDailyInterventionUsd?: number;
  enabled?: boolean;
}

export interface WorkerDecision {
  action: string;
  targetHealthFactor: number;
  repayAmountUsd: number;
  confidence: number;
  reason: string;
}

function clampConfidence(value: number) {
  return Number(Math.min(1, Math.max(0, value)).toFixed(2));
}

function suggestedRepayAmount(
  snapshot: PositionSnapshot,
  targetHealthFactor: number,
  maxRepayPerActionUsd: number
): number {
  const hfGap = Math.max(0, targetHealthFactor - snapshot.healthFactor);
  const urgencyFactor =
    hfGap > 0 ? hfGap / Math.max(targetHealthFactor, 1) : 0.05;
  const baseAmount = snapshot.debtValueUsd * Math.max(0.05, urgencyFactor);
  return Number(
    Math.min(
      snapshot.availableBufferUsd,
      snapshot.debtValueUsd,
      maxRepayPerActionUsd,
      baseAmount
    ).toFixed(2)
  );
}

function fallbackDecision(
  snapshot: PositionSnapshot,
  policy: WorkerPolicy
): WorkerDecision {
  const shouldRepay =
    snapshot.healthFactor < policy.targetHealthFactor ||
    snapshot.distanceToLiquidation < 10 ||
    snapshot.volatilityScore > 0.7;
  const canRepay = policy.allowedActions.includes("REPAY_FROM_BUFFER");
  const repayAmountUsd =
    shouldRepay && canRepay
      ? suggestedRepayAmount(
          snapshot,
          policy.targetHealthFactor,
          policy.maxRepayPerActionUsd
        )
      : 0;

  if (repayAmountUsd > 0) {
    return {
      action: "REPAY_FROM_BUFFER",
      targetHealthFactor: policy.targetHealthFactor,
      repayAmountUsd,
      confidence: clampConfidence((snapshot.oracleConfidence + 0.75) / 2),
      reason:
        "Worker fallback selected buffer repayment because the position is below the target health factor or too close to liquidation.",
    };
  }

  return {
    action: "DO_NOTHING",
    targetHealthFactor: policy.targetHealthFactor,
    repayAmountUsd: 0,
    confidence: clampConfidence((snapshot.oracleConfidence + 0.85) / 2),
    reason:
      "Worker fallback kept the position unchanged because the health factor remains acceptable.",
  };
}

function extractJsonObject(raw: string): WorkerDecision {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] ??
      trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

  return JSON.parse(jsonText) as WorkerDecision;
}

export async function decide(
  snapshot: PositionSnapshot,
  policy: WorkerPolicy
): Promise<WorkerDecision> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackDecision(snapshot, policy);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Borro Agent. Return JSON only. Choose the safest action for the lending position.",
        },
        {
          role: "user",
          content: JSON.stringify({ policy, snapshot }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include content");
  }

  return extractJsonObject(content);
}
