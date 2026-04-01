"use client";

import type {
  AIDecision,
  AllowedAction,
  DecisionValidationResult,
  ExecutionRecord,
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
  decision,
  validation,
  execution,
  error,
  onRunCheck,
  onExecute,
  onReset,
}: AIDecisionCardProps) {
  const badge = STATUS_BADGES[status];

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
            decision={decision}
            validation={validation}
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

function DecisionView({
  decision,
  validation,
  onExecute,
  onReset,
}: {
  decision: AIDecision;
  validation: DecisionValidationResult;
  onExecute: () => void;
  onReset: () => void;
}) {
  const confidencePct = Math.round(decision.confidence * 100);

  return (
    <div className="space-y-4">
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

      <p className="text-sm text-zinc-400">{decision.reason}</p>

      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-2">
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

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {execution.txSignature && (
          <SolscanLink label="Repay TX" signature={execution.txSignature} />
        )}
        {execution.logTxSignature && (
          <SolscanLink
            label="Decision Log TX"
            signature={execution.logTxSignature}
          />
        )}
      </div>

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
