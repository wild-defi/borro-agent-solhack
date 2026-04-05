import type { AIDecision, Policy, PositionSnapshot } from "@/lib/types";
import { calculateSuggestedRepayAmount } from "@/lib/risk/metrics";
import { aiDecisionJsonSchema, parseAIDecision } from "@/lib/ai/schema";
import {
  buildDecisionSystemPrompt,
  buildDecisionUserPrompt,
} from "@/lib/ai/prompts";

const DEFAULT_MODEL = "gpt-4o-mini";

function clampConfidence(value: number) {
  return Number(Math.min(1, Math.max(0, value)).toFixed(2));
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const codeFenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (codeFenceMatch) {
    return JSON.parse(codeFenceMatch[1]);
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("AI response did not contain valid JSON");
}

function buildFallbackDecision(
  snapshot: PositionSnapshot,
  policy?: Partial<Policy>
): AIDecision {
  const targetHealthFactor = policy?.targetHealthFactor ?? 1.25;
  const maxRepayPerActionUsd = policy?.maxRepayPerActionUsd ?? 500;
  const allowedActions = policy?.allowedActions ?? ["DO_NOTHING", "REPAY_FROM_BUFFER"];
  const shouldRepay =
    snapshot.healthFactor < targetHealthFactor ||
    snapshot.distanceToLiquidation < 10 ||
    snapshot.volatilityScore > 0.7 ||
    snapshot.solPriceChange24h <= -5 ||
    snapshot.fearGreedValue <= 25;

  const repayAmountUsd =
    shouldRepay && allowedActions.includes("REPAY_FROM_BUFFER")
      ? calculateSuggestedRepayAmount(
          snapshot,
          targetHealthFactor,
          maxRepayPerActionUsd
        )
      : 0;

  if (repayAmountUsd > 0) {
    const triggers: string[] = [];
    if (snapshot.healthFactor < targetHealthFactor) {
      triggers.push(
        `health factor ${snapshot.healthFactor.toFixed(2)} is below target ${targetHealthFactor.toFixed(2)}`
      );
    }
    if (snapshot.distanceToLiquidation < 10) {
      triggers.push(
        `only ${snapshot.distanceToLiquidation.toFixed(1)}% away from liquidation`
      );
    }
    if (snapshot.volatilityScore > 0.7) {
      triggers.push(
        `elevated volatility score of ${snapshot.volatilityScore.toFixed(2)}`
      );
    }
    if (snapshot.solPriceChange24h <= -5) {
      triggers.push(
        `SOL is down ${Math.abs(snapshot.solPriceChange24h).toFixed(1)}% over the last 24h`
      );
    }
    if (snapshot.oracleConfidenceRatio >= 0.003) {
      triggers.push(
        `Pyth confidence band widened to ${(snapshot.oracleConfidenceRatio * 100).toFixed(2)}% of price`
      );
    }
    if (snapshot.fearGreedValue <= 25) {
      triggers.push(
        `Fear & Greed sits at ${snapshot.fearGreedValue} (${snapshot.fearGreedClassification.toLowerCase()})`
      );
    }

    return {
      action: "REPAY_FROM_BUFFER",
      targetHealthFactor,
      repayAmountUsd,
      confidence: clampConfidence((snapshot.oracleConfidence + 0.75) / 2),
      reason:
        `Position at risk: ${triggers.join("; ")}. Recommending $${repayAmountUsd} USDC buffer repay to restore health factor toward ${targetHealthFactor.toFixed(2)}.`,
    };
  }

  return {
    action: "DO_NOTHING",
    targetHealthFactor,
    repayAmountUsd: 0,
    confidence: clampConfidence((snapshot.oracleConfidence + 0.85) / 2),
    reason:
      `Position is stable: health factor ${snapshot.healthFactor.toFixed(2)} is near target ${targetHealthFactor.toFixed(2)}, SOL 24h change is ${snapshot.solPriceChange24h.toFixed(1)}%, the Pyth confidence band is ${(snapshot.oracleConfidenceRatio * 100).toFixed(2)}% of price, and Fear & Greed is ${snapshot.fearGreedValue} (${snapshot.fearGreedClassification.toLowerCase()}). No intervention needed.`,
  };
}

export async function getAIDecision(
  snapshot: PositionSnapshot,
  policy?: Partial<Policy>,
  options?: { forceMock?: boolean }
): Promise<AIDecision> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || options?.forceMock) {
    return buildFallbackDecision(snapshot, policy);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "borro_ai_decision",
          schema: aiDecisionJsonSchema,
        },
      },
      messages: [
        {
          role: "system",
          content: buildDecisionSystemPrompt(),
        },
        {
          role: "user",
          content: buildDecisionUserPrompt(snapshot, policy),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response did not include content");
  }

  return parseAIDecision(extractJsonObject(content));
}
