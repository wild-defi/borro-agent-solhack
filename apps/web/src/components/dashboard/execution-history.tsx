"use client";

import { useState } from "react";

import type { AllowedAction, ExecutionRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ReasoningPanel } from "@/components/dashboard/ai-decision-card";

const ACTION_LABELS: Record<AllowedAction, string> = {
  DO_NOTHING: "No Action",
  REPAY_FROM_BUFFER: "Repay from Buffer",
  REPAY_WITH_COLLATERAL: "Repay w/ Collateral",
  PARTIAL_DELEVERAGE: "Partial Deleverage",
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function dotColor(record: ExecutionRecord): string {
  if (record.status === "failed" || record.status === "rejected") return "bg-red-400";
  if (record.action === "DO_NOTHING") return "bg-zinc-500";
  return "bg-emerald-400";
}

function statusVariant(status: string): "success" | "danger" | "warning" | "default" {
  if (status === "logged" || status === "confirmed" || status === "simulated") return "success";
  if (status === "failed") return "danger";
  if (status === "rejected") return "warning";
  return "default";
}

const STATUS_LABELS: Record<string, string> = {
  logged: "On-chain",
  confirmed: "Confirmed",
  simulated: "Simulated",
  failed: "Failed",
  rejected: "Rejected",
  pending: "Pending",
};

export default function ExecutionHistory({
  records,
}: {
  records: ExecutionRecord[];
}) {
  if (records.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400">History</h3>
          <Badge variant="default">{records.length}</Badge>
        </div>

        {/* Timeline */}
        <div className="relative">
          {records.map((record, i) => {
            return <HistoryItem key={record.decisionId} record={record} isLast={i === records.length - 1} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryItem({
  record,
  isLast,
}: {
  record: ExecutionRecord;
  isLast: boolean;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotColor(record)}`} />
        {!isLast && <div className="w-px flex-1 bg-zinc-800 min-h-[24px]" />}
      </div>

      <div className={`flex-1 pb-4 ${isLast ? "pb-0" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-zinc-200 truncate">
              {ACTION_LABELS[record.action]}
            </span>
            {record.executedAmountUsd > 0 && (
              <span className="text-sm font-semibold font-[family-name:var(--font-mono)] tabular-nums text-zinc-300">
                ${record.executedAmountUsd.toLocaleString()}
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-600 whitespace-nowrap font-[family-name:var(--font-mono)]">
            {formatTime(record.timestamp)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          {record.healthFactorBefore != null && record.healthFactorAfter != null && (
            <span className="font-[family-name:var(--font-mono)] tabular-nums">
              HF {record.healthFactorBefore.toFixed(2)}{" "}
              <span className="text-zinc-600">→</span>{" "}
              <span className="text-emerald-400">{record.healthFactorAfter.toFixed(2)}</span>
            </span>
          )}
          <Badge variant={statusVariant(record.status)} className="text-[10px] px-1.5 py-0">
            {STATUS_LABELS[record.status] ?? record.status}
          </Badge>
          <span>{timeAgo(record.timestamp)}</span>
          {record.txSignature && (
            <a
              href={`https://solscan.io/tx/${record.txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400/70 hover:text-emerald-400 underline"
            >
              tx
            </a>
          )}
          {record.reasoning && (
            <button
              type="button"
              onClick={() => setShowReasoning((prev) => !prev)}
              className="text-emerald-400/70 hover:text-emerald-400"
            >
              {showReasoning ? "Hide Reasoning" : "View Reasoning"}
            </button>
          )}
        </div>

        {record.reasoning && (
          <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
            <CollapsibleContent className="mt-3">
              <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/20">
                <ReasoningPanel
                  snapshot={record.reasoning.snapshot}
                  policy={record.reasoning.policy}
                  rawDecision={record.reasoning.rawDecision}
                  validatedDecision={record.reasoning.validatedDecision}
                  validation={record.reasoning.validation}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
