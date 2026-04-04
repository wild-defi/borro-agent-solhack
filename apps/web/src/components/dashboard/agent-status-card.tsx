"use client";

import type { AIDecision, ExecutionRecord, PolicyConfig, PositionSnapshot, RiskProfile } from "@/lib/types";
import type { AgentStatus } from "./ai-decision-card";

const PROFILE_LABELS: Record<RiskProfile, string> = {
  conservative: "Early & Gentle",
  balanced: "Smart Balance",
  aggressive: "Max Efficiency",
};

interface AgentStatusCardProps {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  policyAddress: string;
  agentStatus: AgentStatus;
  currentDecision: AIDecision | null;
  currentExecution: ExecutionRecord | null;
  interventionCount: number;
  onRunCheck: () => void;
  onDeposit: () => void;
  onPauseGuard: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type StatusInfo = {
  label: string;
  badgeClass: string;
  description: string;
  healthy: boolean;
};

function resolveStatus(props: AgentStatusCardProps): StatusInfo {
  if (props.agentStatus === "executing") {
    return {
      label: "Intervening",
      badgeClass: "bg-indigo-500/20 text-indigo-400",
      description: "Borro is sending an intervention transaction.",
      healthy: false,
    };
  }

  if (props.agentStatus === "decision_ready") {
    return {
      label: "Decision Ready",
      badgeClass: "bg-amber-500/20 text-amber-400",
      description: "A validated action is ready for review.",
      healthy: false,
    };
  }

  if ((props.snapshot?.availableBufferUsd ?? 0) <= 0) {
    return {
      label: "Needs Buffer",
      badgeClass: "bg-amber-500/20 text-amber-400",
      description: "No repayment buffer available — add funds below to enable protection.",
      healthy: false,
    };
  }

  if ((props.snapshot?.healthFactor ?? 999) <= 1.1) {
    return {
      label: "Risk Detected",
      badgeClass: "bg-red-500/20 text-red-400",
      description: "The position is close to liquidation and may need intervention soon.",
      healthy: false,
    };
  }

  if (props.agentStatus === "executed") {
    return {
      label: "Protected",
      badgeClass: "bg-emerald-500/20 text-emerald-400",
      description: "The latest intervention completed and the position is safer now.",
      healthy: true,
    };
  }

  const hf = props.snapshot?.healthFactor ?? 0;
  if (hf >= 1.1) {
    return {
      label: "Position Healthy",
      badgeClass: "bg-emerald-500/20 text-emerald-400",
      description: "Agent is watching. No action needed.",
      healthy: true,
    };
  }

  return {
    label: "Monitoring Active",
    badgeClass: "bg-emerald-500/20 text-emerald-400",
    description: "Borro is ready to monitor this position using the saved on-chain policy.",
    healthy: false,
  };
}

export default function AgentStatusCard(props: AgentStatusCardProps) {
  const status = resolveStatus(props);
  const lastEventAt =
    props.currentExecution?.timestamp ??
    (props.currentDecision ? props.snapshot?.timestamp : null) ??
    props.snapshot?.timestamp ??
    null;

  return (
    <div className={`rounded-xl border bg-zinc-900 p-6 transition-colors ${
      status.healthy ? "border-emerald-800/40" : "border-zinc-800"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Pulsing dot */}
          <div className="relative mt-0.5 flex-shrink-0">
            <span className={`block h-2.5 w-2.5 rounded-full ${
              status.healthy
                ? "bg-emerald-400"
                : props.agentStatus === "executing" || props.agentStatus === "monitoring"
                  ? "bg-indigo-400"
                  : (props.snapshot?.healthFactor ?? 999) <= 1.1
                    ? "bg-red-400"
                    : "bg-zinc-500"
            }`} />
            {(status.healthy || props.agentStatus === "executing" || props.agentStatus === "monitoring") && (
              <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                status.healthy ? "bg-emerald-400" : "bg-indigo-400"
              }`} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Guard Status</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{status.description}</p>
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${status.badgeClass}`}>
          {status.label}
        </span>
      </div>

      {/* Needs Buffer CTA */}
      {status.label === "Needs Buffer" && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400">
            Fund the buffer so the agent can repay debt on your behalf.
          </p>
          <button
            type="button"
            onClick={props.onDeposit}
            className="ml-4 flex-shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            + Add $300
          </button>
        </div>
      )}

      {/* Healthy callout */}
      {status.healthy && (
        <div className="mt-4 rounded-lg border border-emerald-800/30 bg-emerald-900/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Health Factor: {props.snapshot?.healthFactor?.toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {lastEventAt ? `Last check: ${timeAgo(lastEventAt)}` : "No check yet"}
                {" · "}
                {props.interventionCount === 0
                  ? "No interventions today"
                  : `${props.interventionCount} intervention${props.interventionCount > 1 ? "s" : ""} today`}
              </p>
            </div>
            <span className="text-2xl">🛡️</span>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatusStat
          label="Policy"
          value={shortenAddress(props.policyAddress)}
          sub={PROFILE_LABELS[props.policy.riskProfile]}
        />
        <StatusStat
          label="Buffer"
          value={`$${(props.snapshot?.availableBufferUsd ?? 0).toLocaleString()}`}
          sub="USDC available"
        />
        <StatusStat
          label="Last Activity"
          value={lastEventAt ? timeAgo(lastEventAt) : "Not yet"}
          sub={
            props.currentExecution
              ? "Last intervention"
              : props.currentDecision
                ? "Last assessment"
                : "Waiting for first check"
          }
        />
      </div>

      <div className="mt-5">
        <button
          onClick={props.onRunCheck}
          disabled={props.agentStatus === "monitoring" || props.agentStatus === "executing"}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {props.agentStatus === "monitoring" ? "Checking..." : "Run Check"}
        </button>
      </div>
    </div>
  );
}

function WhatIfBar({ hf }: { hf: number }) {
  const withoutBorro = Math.max(0, (1 - 1 / hf) * 100);
  // Estimate "with Borro" as if HF were 20% higher (agent intervenes before liquidation)
  const projectedHf = hf * 1.2;
  const withBorro = Math.max(0, (1 - 1 / projectedHf) * 100);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-red-400">
          Without Borro
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Liquidation if SOL drops{" "}
          <span className="font-semibold text-red-400">
            {withoutBorro.toFixed(1)}%
          </span>
        </p>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">
          With Borro
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Safe until SOL drops{" "}
          <span className="font-semibold text-emerald-400">
            {withBorro.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

function StatusStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
