"use client";

import { useEffect, useState } from "react";
import type {
  AIDecision,
  ExecutionRecord,
  PolicyConfig,
  PositionSnapshot,
  RiskProfile,
} from "@/lib/types";
import type { AgentStatus } from "./ai-decision-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/use-count-up";

const PROFILE_LABELS: Record<RiskProfile, string> = {
  conservative: "Early & Gentle",
  balanced: "Smart Balance",
  aggressive: "Max Efficiency",
};

interface AgentStatusCardProps {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  agentStatus: AgentStatus;
  currentDecision: AIDecision | null;
  currentExecution: ExecutionRecord | null;
  interventionCount: number;
  lastCheckedAt: number | null;
  nextCheckAt: number | null;
  autonomousIntervalSeconds: number;
  onRunCheck: () => void;
  onDeposit: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

type StatusInfo = {
  label: string;
  variant: "success" | "warning" | "danger" | "info" | "default";
  description: string;
  healthy: boolean;
};

function resolveStatus(props: AgentStatusCardProps): StatusInfo {
  if (props.policy.mode === "autonomous" && props.agentStatus === "monitoring") {
    return {
      label: "Autonomous Sweep",
      variant: "info",
      description: "Borro is running a scheduled autonomous check.",
      healthy: false,
    };
  }

  if (props.agentStatus === "executing") {
    return {
      label: "Intervening",
      variant: "info",
      description: "Borro is sending an intervention transaction.",
      healthy: false,
    };
  }

  if (props.agentStatus === "decision_ready") {
    return {
      label:
        props.policy.mode === "autonomous" ? "Assessment Complete" : "Decision Ready",
      variant: "warning",
      description:
        props.policy.mode === "autonomous"
          ? "The latest autonomous check completed and updated the live assessment."
          : "A validated action is ready for review.",
      healthy: false,
    };
  }

  if ((props.snapshot?.availableBufferUsd ?? 0) <= 0) {
    return {
      label: "Needs Buffer",
      variant: "warning",
      description: "No repayment buffer available — add funds to enable protection.",
      healthy: false,
    };
  }

  if ((props.snapshot?.healthFactor ?? 999) <= 1.1) {
    return {
      label: "Risk Detected",
      variant: "danger",
      description: "Position is close to liquidation and may need intervention.",
      healthy: false,
    };
  }

  if (props.agentStatus === "executed") {
    return {
      label: "Protected",
      variant: "success",
      description: "Latest intervention completed — position is safer now.",
      healthy: true,
    };
  }

  const hf = props.snapshot?.healthFactor ?? 0;
  if (hf >= 1.1) {
    return {
      label: "Position Healthy",
      variant: "success",
      description: "Agent is watching. No action needed.",
      healthy: true,
    };
  }

  return {
    label: props.policy.mode === "autonomous" ? "Autonomous Armed" : "Monitoring",
    variant: props.policy.mode === "autonomous" ? "info" : "default",
    description:
      props.policy.mode === "autonomous"
        ? "Borro will keep checking on a timer and can act within your limits."
        : "Borro is ready to monitor this position.",
    healthy: false,
  };
}

function computeSafeMargin(hf: number): number {
  if (hf <= 1) return 0;
  // Safe margin: how far from liquidation (HF=1) relative to a "fully safe" HF of 2.0
  return Math.min(100, Math.round(((hf - 1) / 1) * 100));
}

function dotColor(status: StatusInfo, agentStatus: AgentStatus): string {
  if (status.healthy) return "bg-emerald-400";
  if (agentStatus === "executing" || agentStatus === "monitoring") return "bg-sky-400";
  if (status.variant === "danger") return "bg-red-400";
  if (status.variant === "warning") return "bg-amber-400";
  return "bg-zinc-500";
}

function dotGlow(status: StatusInfo, agentStatus: AgentStatus): string {
  if (status.healthy) return "glow-emerald";
  if (agentStatus === "executing" || agentStatus === "monitoring") return "";
  if (status.variant === "danger") return "glow-red";
  if (status.variant === "warning") return "glow-amber";
  return "";
}

export default function AgentStatusCard(props: AgentStatusCardProps) {
  const status = resolveStatus(props);
  const hf = props.snapshot?.healthFactor ?? 0;
  const safeMargin = computeSafeMargin(hf);
  const animatedMargin = useCountUp(safeMargin, { duration: 700 });
  const animatedHf = useCountUp(hf, { duration: 700, decimals: 2 });
  const lastEventAt =
    props.currentExecution?.timestamp ??
    (props.currentDecision ? props.snapshot?.timestamp : null) ??
    props.snapshot?.timestamp ??
    null;
  const [now, setNow] = useState(Date.now());

  const isPulsing = status.healthy || props.agentStatus === "executing" || props.agentStatus === "monitoring";
  const autonomousCountdownSeconds = props.nextCheckAt
    ? Math.max(0, Math.ceil((props.nextCheckAt - now) / 1000))
    : null;

  useEffect(() => {
    if (props.policy.mode !== "autonomous" || !props.nextCheckAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [props.policy.mode, props.nextCheckAt]);

  return (
    <Card className={`relative overflow-hidden transition-colors ${
      status.healthy ? "border-emerald-800/40" : ""
    }`}>
      <CardContent className="p-6">
        {/* Hero header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Status dot with glow */}
            <div className="relative mt-0.5 flex-shrink-0">
              <span className={`block h-3 w-3 rounded-full ${dotColor(status, props.agentStatus)} ${dotGlow(status, props.agentStatus)}`} />
              {isPulsing && (
                <span className={`absolute inset-0 rounded-full animate-ping opacity-50 ${
                  status.healthy ? "bg-emerald-400" : "bg-sky-400"
                }`} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold font-[family-name:var(--font-mono)]">
                AI Guard
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">{status.description}</p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Health progress bar — the hero visual */}
        {props.snapshot && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-zinc-400">Safe Margin</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-[family-name:var(--font-mono)] tabular-nums ${
                  safeMargin > 25 ? "text-emerald-400" : safeMargin > 10 ? "text-amber-400" : "text-red-400"
                }`}>
                  {animatedMargin}%
                </span>
                <span className="text-xs text-zinc-600">
                  HF {animatedHf.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="relative h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="health-bar-gradient h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, safeMargin)}%` }}
              />
              {/* Liquidation threshold marker */}
              <div className="absolute top-0 left-0 h-full w-px bg-red-500/50" style={{ left: "0%" }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-red-400/60">Liquidation</span>
              <span className="text-[10px] text-emerald-400/60">Safe</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
          <TelemetryChip
            accent
            label={props.policy.mode === "autonomous" ? "Auto" : "Review"}
          />
          <TelemetryChip label={PROFILE_LABELS[props.policy.riskProfile]} />
          <TelemetryChip
            label={`Buffer $${Number(props.snapshot?.availableBufferUsd ?? 0).toLocaleString()}`}
          />
          <TelemetryChip
            label={
              props.interventionCount === 0
                ? "No interventions yet"
                : `${props.interventionCount} intervention${
                    props.interventionCount > 1 ? "s" : ""
                  }`
            }
          />
          <TelemetryChip
            label={`Last check ${
              props.lastCheckedAt ? timeAgo(props.lastCheckedAt) : "pending"
            }`}
          />
          {props.policy.mode === "autonomous" && (
            <TelemetryChip
              accent={autonomousCountdownSeconds != null && autonomousCountdownSeconds <= 10}
              label={`Next in ${
                autonomousCountdownSeconds != null ? `${autonomousCountdownSeconds}s` : "queued"
              }`}
            />
          )}
        </div>

        {/* Needs Buffer CTA */}
        {status.label === "Needs Buffer" && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-400">
              Fund the buffer so the agent can repay debt on your behalf.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onDeposit}
              className="ml-4 flex-shrink-0 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
            >
              + Add $300
            </Button>
          </div>
        )}

        {/* Action */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={props.onRunCheck}
            disabled={props.agentStatus === "monitoring" || props.agentStatus === "executing"}
            variant="ghost"
            className="w-full sm:w-auto"
          >
            {props.agentStatus === "monitoring" ? "Checking..." : "Run Check"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TelemetryChip({
  label,
  accent = false,
}: {
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide ${
        accent
          ? "border-zinc-700 bg-zinc-800/80 text-zinc-200"
          : "border-zinc-800/70 bg-zinc-900/60 text-zinc-500"
      }`}
    >
      {label}
    </span>
  );
}
