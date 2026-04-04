"use client";

import { useMemo, useState } from "react";

import type {
  AIDecision,
  AllowedAction,
  DecisionValidationResult,
  ExecutionRecord,
  PolicyConfig,
  PositionSnapshot,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type AgentStatus =
  | "idle"
  | "monitoring"
  | "decision_ready"
  | "executing"
  | "executed";

interface AIDecisionCardProps {
  title?: string;
  status: AgentStatus;
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  rawDecision: AIDecision | null;
  decision: AIDecision | null;
  validation: DecisionValidationResult | null;
  execution: ExecutionRecord | null;
  error: string | null;
  onRunCheck: () => void;
  onExecute: () => void;
  onReset: () => void;
}

const ACTION_LABELS: Record<AllowedAction, string> = {
  DO_NOTHING: "No Action Needed",
  REPAY_FROM_BUFFER: "Repay from Buffer",
  REPAY_WITH_COLLATERAL: "Repay with Collateral",
  PARTIAL_DELEVERAGE: "Partial Deleverage",
};

const STATUS_BADGE_MAP: Record<AgentStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  idle: { label: "Idle", variant: "default" },
  monitoring: { label: "Analyzing...", variant: "info" },
  decision_ready: { label: "Decision Ready", variant: "warning" },
  executing: { label: "Executing...", variant: "info" },
  executed: { label: "Complete", variant: "success" },
};

export default function AIDecisionCard({
  title = "AI Assessment",
  status,
  snapshot,
  policy,
  rawDecision,
  decision,
  validation,
  execution,
  error,
  onRunCheck,
  onExecute,
  onReset,
}: AIDecisionCardProps) {
  const badge = STATUS_BADGE_MAP[status];
  const [showReasoning, setShowReasoning] = useState(false);
  const isExpandable = status !== "idle";
  const [isOpen, setIsOpen] = useState(true);

  // When idle, show a minimal collapsed card
  if (status === "idle" && !error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
              <Badge variant="default">Idle</Badge>
            </div>
            <p className="text-xs text-zinc-600">
              Use <span className="text-zinc-400">Run Check</span> to analyze
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-5">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
                <Badge variant={badge.variant} className={
                  status === "monitoring" || status === "executing" ? "animate-pulse" : ""
                }>
                  {badge.label}
                </Badge>
              </div>
              <span className="text-xs text-zinc-600">
                {isOpen ? "Collapse" : "Expand"}
              </span>
            </button>
          </CollapsibleTrigger>

          <AgentStepper status={status} />

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <CollapsibleContent>
            <div className="mt-5">
              {status === "monitoring" && <MonitoringView />}
              {status === "decision_ready" && decision && validation && (
                <DecisionView
                  snapshot={snapshot}
                  policy={policy}
                  rawDecision={rawDecision}
                  decision={decision}
                  validation={validation}
                  showReasoning={showReasoning}
                  onToggleReasoning={() => setShowReasoning((prev) => !prev)}
                  onExecute={onExecute}
                  onReset={onReset}
                />
              )}
              {status === "executing" && <ExecutingView />}
              {status === "executed" && execution && (
                <ExecutedView execution={execution} onReset={onReset} />
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

const STEPS = [
  { key: "detect", label: "Detect" },
  { key: "analyze", label: "Analyze" },
  { key: "decide", label: "Decide" },
  { key: "validate", label: "Validate" },
  { key: "execute", label: "Execute" },
] as const;

function stepStates(status: AgentStatus): { doneUpTo: number; active: number | null } {
  switch (status) {
    case "idle":           return { doneUpTo: -1, active: null };
    case "monitoring":     return { doneUpTo: 0,  active: 1 };
    case "decision_ready": return { doneUpTo: 3,  active: null };
    case "executing":      return { doneUpTo: 3,  active: 4 };
    case "executed":       return { doneUpTo: 4,  active: null };
  }
}

function AgentStepper({ status }: { status: AgentStatus }) {
  const { doneUpTo, active } = stepStates(status);

  return (
    <div className="mt-4 flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i <= doneUpTo;
        const current = active !== null && i === active;
        const dotClass = done
          ? "bg-emerald-500"
          : current
            ? "bg-emerald-400 animate-pulse"
            : "bg-zinc-700";
        const lineClass = i <= doneUpTo ? "bg-emerald-500/50" : "bg-zinc-700/50";
        const labelClass = done
          ? "text-emerald-400"
          : current
            ? "text-emerald-300"
            : "text-zinc-600";

        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`h-2 w-2 rounded-full ${dotClass}`} />
              <span className={`text-[10px] font-medium font-[family-name:var(--font-mono)] ${labelClass}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full ${lineClass}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonitoringView() {
  return (
    <div className="flex items-center gap-3 py-4">
      <Spinner />
      <p className="text-sm text-zinc-400">Analyzing position health...</p>
    </div>
  );
}

function signalColor(level: "danger" | "warning" | "safe") {
  if (level === "danger") return "text-red-400";
  if (level === "warning") return "text-amber-400";
  return "text-emerald-400";
}

function signalDot(level: "danger" | "warning" | "safe") {
  if (level === "danger") return "bg-red-400";
  if (level === "warning") return "bg-amber-400";
  return "bg-emerald-400";
}

function AnalysisSignal({
  label,
  value,
  level,
}: {
  label: string;
  value: string;
  level: "danger" | "warning" | "safe";
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${signalDot(level)}`} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className={`text-xs font-medium font-[family-name:var(--font-mono)] tabular-nums ${signalColor(level)}`}>
        {value}
      </span>
    </div>
  );
}

function DecisionView({
  snapshot,
  policy,
  rawDecision,
  decision,
  validation,
  showReasoning,
  onToggleReasoning,
  onExecute,
  onReset,
}: {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  rawDecision: AIDecision | null;
  decision: AIDecision;
  validation: DecisionValidationResult;
  showReasoning: boolean;
  onToggleReasoning: () => void;
  onExecute: () => void;
  onReset: () => void;
}) {
  const confidencePct = Math.round(decision.confidence * 100);
  const reasoningSignals = useMemo(
    () => buildReasoningSignals(snapshot, rawDecision ?? decision),
    [snapshot, rawDecision, decision]
  );

  return (
    <div className="space-y-4">
      {/* Position Analysis */}
      {snapshot && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 space-y-2">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Position Analysis
          </p>
          <AnalysisSignal
            label="Health Factor"
            value={`${snapshot.healthFactor.toFixed(2)} (target: ${decision.targetHealthFactor.toFixed(2)})`}
            level={snapshot.healthFactor <= 1.1 ? "danger" : snapshot.healthFactor < decision.targetHealthFactor ? "warning" : "safe"}
          />
          <AnalysisSignal
            label="Distance to Liquidation"
            value={`${snapshot.distanceToLiquidation.toFixed(1)}%`}
            level={snapshot.distanceToLiquidation < 5 ? "danger" : snapshot.distanceToLiquidation < 10 ? "warning" : "safe"}
          />
          <AnalysisSignal
            label="Volatility"
            value={snapshot.volatilityScore.toFixed(2)}
            level={snapshot.volatilityScore > 0.7 ? "danger" : snapshot.volatilityScore > 0.4 ? "warning" : "safe"}
          />
          <AnalysisSignal
            label="Oracle Confidence"
            value={`${Math.round(snapshot.oracleConfidence * 100)}%`}
            level={snapshot.oracleConfidence < 0.5 ? "danger" : snapshot.oracleConfidence < 0.8 ? "warning" : "safe"}
          />
          <AnalysisSignal
            label="Buffer Available"
            value={`$${snapshot.availableBufferUsd.toLocaleString()}`}
            level={snapshot.availableBufferUsd < decision.repayAmountUsd ? "danger" : "safe"}
          />
        </div>
      )}

      {/* AI Decision */}
      <div className="flex items-center gap-3">
        <Badge variant="accent" className="text-sm px-3 py-1">
          {ACTION_LABELS[decision.action]}
        </Badge>
        <span className="text-sm text-zinc-500 font-[family-name:var(--font-mono)]">
          {confidencePct}% confidence
        </span>
      </div>

      {decision.action !== "DO_NOTHING" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">Repay Amount</p>
            <p className="mt-1 text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
              ${decision.repayAmountUsd.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">Target HF</p>
            <p className="mt-1 text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
              {decision.targetHealthFactor.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-zinc-400 italic">{decision.reason}</p>

      {/* Validation */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Policy Validation
          </span>
          <Badge variant={validation.approved ? "success" : "danger"}>
            {validation.approved ? "Approved" : "Rejected"}
          </Badge>
          {validation.wasModified && (
            <Badge variant="warning">Modified</Badge>
          )}
        </div>
        {validation.reasons.length > 0 && (
          <ul className="mt-2 space-y-1">
            {validation.reasons.map((r, i) => (
              <li key={i} className="text-xs text-zinc-500">
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        {validation.approved && decision.action !== "DO_NOTHING" && (
          <Button onClick={onExecute}>
            Execute Decision
          </Button>
        )}
        <Button variant="outline" onClick={onReset}>
          Skip
        </Button>
      </div>

      {/* AI Reasoning — collapsible */}
      <Collapsible open={showReasoning} onOpenChange={onToggleReasoning}>
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  AI Reasoning
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Model input, raw output, and guardrail adjustments
                </p>
              </div>
              <span className="text-xs text-emerald-400/70">
                {showReasoning ? "Hide" : "View"}
              </span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ReasoningPanel
              snapshot={snapshot}
              policy={policy}
              rawDecision={rawDecision ?? decision}
              validatedDecision={decision}
              validation={validation}
              reasoningSignals={reasoningSignals}
            />
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

function buildReasoningSignals(
  snapshot: PositionSnapshot | null,
  decision: AIDecision
) {
  if (!snapshot) return [];
  const signals: string[] = [];
  if (snapshot.healthFactor < decision.targetHealthFactor) {
    signals.push(`Health factor ${snapshot.healthFactor.toFixed(2)} is below target ${decision.targetHealthFactor.toFixed(2)}.`);
  }
  if (snapshot.distanceToLiquidation < 10) {
    signals.push(`Position is only ${snapshot.distanceToLiquidation.toFixed(1)}% away from liquidation.`);
  }
  if (snapshot.volatilityScore > 0.4) {
    signals.push(`Volatility score ${snapshot.volatilityScore.toFixed(2)} suggests unstable market conditions.`);
  }
  if (snapshot.oracleConfidence < 0.9) {
    signals.push(`Oracle confidence is ${Math.round(snapshot.oracleConfidence * 100)}%, so the model should stay conservative.`);
  }
  if (snapshot.availableBufferUsd > 0) {
    signals.push(`Safety buffer has $${snapshot.availableBufferUsd.toLocaleString()} available for fast repayment.`);
  }
  return signals;
}

function DecisionSummary({ title, decision }: { title: string; decision: AIDecision }) {
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-zinc-600 text-xs">Action</dt>
          <dd className="mt-0.5 font-medium text-zinc-100">{ACTION_LABELS[decision.action]}</dd>
        </div>
        <div>
          <dt className="text-zinc-600 text-xs">Confidence</dt>
          <dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{Math.round(decision.confidence * 100)}%</dd>
        </div>
        <div>
          <dt className="text-zinc-600 text-xs">Repay Amount</dt>
          <dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">${decision.repayAmountUsd.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-zinc-600 text-xs">Target HF</dt>
          <dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{decision.targetHealthFactor.toFixed(2)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-zinc-400">{decision.reason}</p>
    </div>
  );
}

function ReasoningPanel({
  snapshot,
  policy,
  rawDecision,
  validatedDecision,
  validation,
  reasoningSignals,
}: {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  rawDecision: AIDecision;
  validatedDecision: AIDecision;
  validation: DecisionValidationResult;
  reasoningSignals: string[];
}) {
  const decisionChanged =
    rawDecision.action !== validatedDecision.action ||
    rawDecision.repayAmountUsd !== validatedDecision.repayAmountUsd ||
    rawDecision.targetHealthFactor !== validatedDecision.targetHealthFactor ||
    rawDecision.confidence !== validatedDecision.confidence ||
    rawDecision.reason !== validatedDecision.reason;

  return (
    <div className="space-y-4 border-t border-zinc-700/50 px-4 py-4">
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Policy Context</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-zinc-600 text-xs">Enabled</dt><dd className="mt-0.5 font-medium text-zinc-100">{policy.enabled ? "Yes" : "No"}</dd></div>
          <div><dt className="text-zinc-600 text-xs">Risk Profile</dt><dd className="mt-0.5 font-medium capitalize text-zinc-100">{policy.riskProfile}</dd></div>
          <div><dt className="text-zinc-600 text-xs">Target HF</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{policy.targetHealthFactor.toFixed(2)}</dd></div>
          <div><dt className="text-zinc-600 text-xs">Max Repay</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">${policy.maxRepayPerActionUsd.toLocaleString()}</dd></div>
          <div><dt className="text-zinc-600 text-xs">Daily Cap</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">${policy.maxDailyInterventionUsd.toLocaleString()}</dd></div>
          <div><dt className="text-zinc-600 text-xs">Cooldown</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{Math.round(policy.cooldownSeconds / 60)} min</dd></div>
        </dl>
        <p className="mt-3 text-xs text-zinc-500">Allowed: {policy.allowedActions.join(", ")}</p>
      </div>

      {snapshot && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Input Snapshot</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><dt className="text-zinc-600 text-xs">Health Factor</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{snapshot.healthFactor.toFixed(2)}</dd></div>
            <div><dt className="text-zinc-600 text-xs">LTV</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{snapshot.ltv.toFixed(2)}%</dd></div>
            <div><dt className="text-zinc-600 text-xs">Dist. to Liq</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{snapshot.distanceToLiquidation.toFixed(2)}%</dd></div>
            <div><dt className="text-zinc-600 text-xs">Buffer</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">${snapshot.availableBufferUsd.toLocaleString()}</dd></div>
            <div><dt className="text-zinc-600 text-xs">Volatility</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{snapshot.volatilityScore.toFixed(2)}</dd></div>
            <div><dt className="text-zinc-600 text-xs">Oracle Conf.</dt><dd className="mt-0.5 font-medium text-zinc-100 font-[family-name:var(--font-mono)]">{Math.round(snapshot.oracleConfidence * 100)}%</dd></div>
          </dl>
          {reasoningSignals.length > 0 && (
            <ul className="mt-3 space-y-1">
              {reasoningSignals.map((signal) => (
                <li key={signal} className="text-xs text-zinc-500">• {signal}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DecisionSummary title="Raw Model Output" decision={rawDecision} />

      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Guardrail Result</p>
          <Badge variant={validation.approved ? "success" : "danger"}>
            {validation.approved ? "Approved" : "Rejected"}
          </Badge>
        </div>
        {decisionChanged ? (
          <div className="mt-3 space-y-3">
            <DecisionSummary title="Validated Decision" decision={validatedDecision} />
            {validation.reasons.length > 0 && (
              <ul className="space-y-1 text-xs text-zinc-500">
                {validation.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-zinc-500">
              No guardrail changes required. Validated decision matches model output.
            </p>
            {validation.reasons.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                {validation.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutingView() {
  return (
    <div className="flex items-center gap-3 py-4">
      <Spinner />
      <p className="text-sm text-zinc-400">Executing on-chain...</p>
    </div>
  );
}

function ExecutedView({
  execution,
  onReset,
}: {
  execution: ExecutionRecord;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ExecutionStatusBadge status={execution.status} />
        <span className="text-sm text-zinc-500">
          {ACTION_LABELS[execution.action]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">Amount</p>
          <p className="mt-1 text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
            ${execution.executedAmountUsd.toLocaleString()}
          </p>
        </div>
        {execution.healthFactorBefore != null && execution.healthFactorAfter != null && (
          <>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">HF Before</p>
              <p className="mt-1 text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums text-red-400">
                {execution.healthFactorBefore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">HF After</p>
              <p className="mt-1 text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums text-emerald-400">
                {execution.healthFactorAfter.toFixed(2)}
              </p>
            </div>
          </>
        )}
      </div>

      {execution.reason && (
        <p className="text-sm text-zinc-400">{execution.reason}</p>
      )}

      {/* Counterfactual comparison */}
      {execution.healthFactorBefore != null && execution.healthFactorAfter != null && (
        <CounterfactualDisplay
          hfBefore={execution.healthFactorBefore}
          hfAfter={execution.healthFactorAfter}
          repayAmount={execution.executedAmountUsd}
        />
      )}

      {/* Verified on Solana */}
      {(execution.txSignature || execution.logTxSignature) && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-emerald-400">Verified on Solana</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {execution.txSignature && (
              <SolscanLink label="Repay TX" signature={execution.txSignature} />
            )}
            {execution.logTxSignature && (
              <SolscanLink label="Decision Log" signature={execution.logTxSignature} />
            )}
          </div>
        </div>
      )}

      <Button onClick={onReset}>Run Check</Button>
    </div>
  );
}

const EXEC_STATUS_LABELS: Record<string, string> = {
  success: "Success",
  simulated: "Simulated",
  logged: "On-chain",
  failed: "Failed",
  rejected: "Rejected",
  pending: "Pending",
  executing: "Executing",
};

const EXEC_STATUS_VARIANTS: Record<string, "success" | "danger" | "warning" | "info" | "default"> = {
  success: "success",
  simulated: "info",
  logged: "success",
  failed: "danger",
  rejected: "warning",
  pending: "info",
  executing: "info",
};

export function ExecutionStatusBadge({ status }: { status: ExecutionRecord["status"] }) {
  return (
    <Badge variant={EXEC_STATUS_VARIANTS[status] ?? "default"} className={
      status === "executing" ? "animate-pulse" : ""
    }>
      {EXEC_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function CounterfactualDisplay({
  hfBefore,
  hfAfter,
  repayAmount,
}: {
  hfBefore: number;
  hfAfter: number;
  repayAmount: number;
}) {
  const withoutBorroDropPct = Math.max(0, (1 - 1 / hfBefore) * 100);
  const withBorroDropPct = Math.max(0, (1 - 1 / hfAfter) * 100);

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 space-y-3">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
        What-If Comparison
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[10px] text-red-400 font-medium uppercase">Without Borro</p>
          <p className="text-sm text-zinc-300 mt-1">
            Liquidation if SOL drops <span className="text-red-400 font-semibold font-[family-name:var(--font-mono)]">{withoutBorroDropPct.toFixed(1)}%</span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <p className="text-[10px] text-emerald-400 font-medium uppercase">With Borro</p>
          <p className="text-sm text-zinc-300 mt-1">
            Safe until SOL drops <span className="text-emerald-400 font-semibold font-[family-name:var(--font-mono)]">{withBorroDropPct.toFixed(1)}%</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-zinc-600">
        ${repayAmount} buffer repay gave {(withBorroDropPct - withoutBorroDropPct).toFixed(1)}% more safety margin
      </p>
    </div>
  );
}

function SolscanLink({ label, signature }: { label: string; signature: string }) {
  return (
    <a
      href={`https://solscan.io/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-emerald-400/70 hover:text-emerald-400 underline font-[family-name:var(--font-mono)]"
    >
      {label}: {signature.slice(0, 8)}...{signature.slice(-4)}
    </a>
  );
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
  );
}
