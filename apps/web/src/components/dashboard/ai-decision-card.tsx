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

export type AgentStatus =
  | "idle"
  | "monitoring"
  | "decision_ready"
  | "executing"
  | "executed";

interface AIDecisionCardProps {
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

const STATUS_BADGES: Record<
  AgentStatus,
  { label: string; className: string }
> = {
  idle: {
    label: "Idle",
    className: "bg-zinc-700/30 text-zinc-400",
  },
  monitoring: {
    label: "Analyzing...",
    className: "bg-blue-500/20 text-blue-400 animate-pulse",
  },
  decision_ready: {
    label: "Decision Ready",
    className: "bg-amber-500/20 text-amber-400",
  },
  executing: {
    label: "Executing...",
    className: "bg-indigo-500/20 text-indigo-400 animate-pulse",
  },
  executed: {
    label: "Complete",
    className: "bg-emerald-500/20 text-emerald-400",
  },
};

export default function AIDecisionCard({
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
  const badge = STATUS_BADGES[status];
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Guard</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <AgentStepper status={status} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-5">
        {status === "idle" && <IdleView onRunCheck={onRunCheck} />}
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
    </div>
  );
}

const STEPS = [
  { key: "detect", label: "Detect" },
  { key: "analyze", label: "Analyze" },
  { key: "decide", label: "Decide" },
  { key: "validate", label: "Validate" },
  { key: "execute", label: "Execute" },
] as const;

function stepIndex(status: AgentStatus): number {
  switch (status) {
    case "idle": return -1;
    case "monitoring": return 1; // analyzing
    case "decision_ready": return 3; // validated
    case "executing": return 4;
    case "executed": return 5; // all done
  }
}

function AgentStepper({ status }: { status: AgentStatus }) {
  const active = stepIndex(status);

  return (
    <div className="mt-4 flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        const dotClass = done
          ? "bg-emerald-500"
          : current
            ? "bg-indigo-500 animate-pulse"
            : "bg-zinc-700";
        const lineClass = done ? "bg-emerald-500/50" : "bg-zinc-700/50";
        const labelClass = done
          ? "text-emerald-400"
          : current
            ? "text-indigo-400"
            : "text-zinc-600";

        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
              <span className={`text-[10px] font-medium ${labelClass}`}>
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

function IdleView({ onRunCheck }: { onRunCheck: () => void }) {
  return (
    <div className="text-center py-4">
      <p className="text-sm text-zinc-400 mb-4">
        Analyze your position and get an AI-powered risk assessment
      </p>
      <button
        onClick={onRunCheck}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Run Check
      </button>
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
        <span className={`h-2 w-2 rounded-full ${signalDot(level)}`} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className={`text-xs font-medium ${signalColor(level)}`}>
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
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
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
        <span className="rounded-lg bg-indigo-600/20 px-3 py-1.5 text-sm font-medium text-indigo-400">
          {ACTION_LABELS[decision.action]}
        </span>
        <span className="text-sm text-zinc-500">
          Confidence: {confidencePct}%
        </span>
      </div>

      {decision.action !== "DO_NOTHING" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-500">Repay Amount</p>
            <p className="mt-1 text-xl font-semibold">
              ${decision.repayAmountUsd.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Target Health Factor</p>
            <p className="mt-1 text-xl font-semibold">
              {decision.targetHealthFactor.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-zinc-400 italic">{decision.reason}</p>

      {/* Validation */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Policy Validation
          </span>
          {validation.approved ? (
            <span className="text-emerald-400 text-xs font-medium">
              Approved
            </span>
          ) : (
            <span className="text-red-400 text-xs font-medium">Rejected</span>
          )}
          {validation.wasModified && (
            <span className="text-amber-400 text-xs font-medium">
              (modified)
            </span>
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
          <button
            onClick={onExecute}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Execute Decision
          </button>
        )}
        <button
          onClick={onReset}
          className="rounded-lg border border-zinc-700 px-6 py-2.5 font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Dismiss
        </button>
      </div>

      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20">
        <button
          type="button"
          onClick={onToggleReasoning}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              AI Reasoning
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              View the model input, raw output, and guardrail adjustments
            </p>
          </div>
          <span className="text-sm text-indigo-400">
            {showReasoning ? "Hide" : "View"}
          </span>
        </button>

        {showReasoning && (
          <ReasoningPanel
            snapshot={snapshot}
            policy={policy}
            rawDecision={rawDecision ?? decision}
            validatedDecision={decision}
            validation={validation}
            reasoningSignals={reasoningSignals}
          />
        )}
      </div>
    </div>
  );
}

function buildReasoningSignals(
  snapshot: PositionSnapshot | null,
  decision: AIDecision
) {
  if (!snapshot) {
    return [];
  }

  const signals: string[] = [];

  if (snapshot.healthFactor < decision.targetHealthFactor) {
    signals.push(
      `Health factor ${snapshot.healthFactor.toFixed(2)} is below target ${decision.targetHealthFactor.toFixed(2)}.`
    );
  }

  if (snapshot.distanceToLiquidation < 10) {
    signals.push(
      `Position is only ${snapshot.distanceToLiquidation.toFixed(1)}% away from liquidation.`
    );
  }

  if (snapshot.volatilityScore > 0.4) {
    signals.push(
      `Volatility score ${snapshot.volatilityScore.toFixed(2)} suggests unstable market conditions.`
    );
  }

  if (snapshot.oracleConfidence < 0.9) {
    signals.push(
      `Oracle confidence is ${Math.round(snapshot.oracleConfidence * 100)}%, so the model should stay conservative.`
    );
  }

  if (snapshot.availableBufferUsd > 0) {
    signals.push(
      `Safety buffer has $${snapshot.availableBufferUsd.toLocaleString()} available for fast repayment.`
    );
  }

  return signals;
}

function DecisionSummary({
  title,
  decision,
}: {
  title: string;
  decision: AIDecision;
}) {
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {title}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">Action</dt>
          <dd className="mt-0.5 font-medium text-zinc-100">
            {ACTION_LABELS[decision.action]}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Confidence</dt>
          <dd className="mt-0.5 font-medium text-zinc-100">
            {Math.round(decision.confidence * 100)}%
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Repay Amount</dt>
          <dd className="mt-0.5 font-medium text-zinc-100">
            ${decision.repayAmountUsd.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Target HF</dt>
          <dd className="mt-0.5 font-medium text-zinc-100">
            {decision.targetHealthFactor.toFixed(2)}
          </dd>
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
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Policy Context
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Enabled</dt>
            <dd className="mt-0.5 font-medium text-zinc-100">
              {policy.enabled ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Risk Profile</dt>
            <dd className="mt-0.5 font-medium capitalize text-zinc-100">
              {policy.riskProfile}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Target HF</dt>
            <dd className="mt-0.5 font-medium text-zinc-100">
              {policy.targetHealthFactor.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Max Repay</dt>
            <dd className="mt-0.5 font-medium text-zinc-100">
              ${policy.maxRepayPerActionUsd.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Daily Cap</dt>
            <dd className="mt-0.5 font-medium text-zinc-100">
              ${policy.maxDailyInterventionUsd.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Cooldown</dt>
            <dd className="mt-0.5 font-medium text-zinc-100">
              {Math.round(policy.cooldownSeconds / 60)} min
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-zinc-400">
          Allowed actions: {policy.allowedActions.join(", ")}
        </p>
      </div>

      {snapshot && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Input Snapshot
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Health Factor</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                {snapshot.healthFactor.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">LTV</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                {snapshot.ltv.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Distance to Liq</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                {snapshot.distanceToLiquidation.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Buffer</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                ${snapshot.availableBufferUsd.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Volatility</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                {snapshot.volatilityScore.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Oracle Confidence</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                {Math.round(snapshot.oracleConfidence * 100)}%
              </dd>
            </div>
          </dl>

          {reasoningSignals.length > 0 && (
            <ul className="mt-3 space-y-1">
              {reasoningSignals.map((signal) => (
                <li key={signal} className="text-sm text-zinc-400">
                  • {signal}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DecisionSummary title="Raw Model Output" decision={rawDecision} />

      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Guardrail Result
          </p>
          <span
            className={`text-xs font-medium ${
              validation.approved ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {validation.approved ? "Approved" : "Rejected"}
          </span>
        </div>

        {decisionChanged ? (
          <div className="mt-3 space-y-3">
            <DecisionSummary
              title="Validated Decision"
              decision={validatedDecision}
            />
            {validation.reasons.length > 0 && (
              <ul className="space-y-1 text-sm text-zinc-400">
                {validation.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-zinc-400">
              No guardrail changes were required. The validated decision matches the raw model output.
            </p>
            {validation.reasons.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
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
  const success =
    execution.status === "success" ||
    execution.status === "simulated" ||
    execution.status === "logged";

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
          <p className="text-sm text-zinc-500">Amount</p>
          <p className="mt-1 text-xl font-semibold">
            ${execution.executedAmountUsd.toLocaleString()}
          </p>
        </div>
        {execution.healthFactorBefore != null &&
          execution.healthFactorAfter != null && (
            <>
              <div>
                <p className="text-sm text-zinc-500">HF Before</p>
                <p className="mt-1 text-xl font-semibold text-red-400">
                  {execution.healthFactorBefore.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">HF After</p>
                <p className="mt-1 text-xl font-semibold text-emerald-400">
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

      {/* Verified on Solana badge */}
      {(execution.txSignature || execution.logTxSignature) && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-emerald-400">
              Verified on Solana
            </span>
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

      <button
        onClick={onReset}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500"
      >
        New Check
      </button>
    </div>
  );
}

export function ExecutionStatusBadge({
  status,
}: {
  status: ExecutionRecord["status"];
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-500/20 text-emerald-400",
    simulated: "bg-blue-500/20 text-blue-400",
    logged: "bg-amber-500/20 text-amber-400",
    failed: "bg-red-500/20 text-red-400",
    rejected: "bg-zinc-700/30 text-zinc-400",
    pending: "bg-indigo-500/20 text-indigo-400",
    executing: "bg-indigo-500/20 text-indigo-400 animate-pulse",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
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
  // Estimate price drop that would trigger liquidation (HF=1.0)
  // HF = collateral * liquidation_threshold / debt
  // Price drop % = (1 - 1/HF) * 100
  const withoutBorroDropPct = Math.max(0, (1 - 1 / hfBefore) * 100);
  const withBorroDropPct = Math.max(0, (1 - 1 / hfAfter) * 100);

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 space-y-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        What-If Comparison
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[10px] text-red-400 font-medium uppercase">Without Borro</p>
          <p className="text-sm text-zinc-300 mt-1">
            Liquidation if SOL drops <span className="text-red-400 font-semibold">{withoutBorroDropPct.toFixed(1)}%</span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <p className="text-[10px] text-emerald-400 font-medium uppercase">With Borro</p>
          <p className="text-sm text-zinc-300 mt-1">
            Safe until SOL drops <span className="text-emerald-400 font-semibold">{withBorroDropPct.toFixed(1)}%</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        ${repayAmount} buffer repay gave you {(withBorroDropPct - withoutBorroDropPct).toFixed(1)}% more safety margin
      </p>
    </div>
  );
}

function SolscanLink({
  label,
  signature,
}: {
  label: string;
  signature: string;
}) {
  return (
    <a
      href={`https://solscan.io/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-indigo-400 hover:text-indigo-300 underline"
    >
      {label}: {signature.slice(0, 8)}...{signature.slice(-4)}
    </a>
  );
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
  );
}
