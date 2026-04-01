"use client";

import type { AllowedAction, ExecutionRecord } from "@/lib/types";
import { ExecutionStatusBadge } from "./ai-decision-card";

const ACTION_LABELS: Record<AllowedAction, string> = {
  DO_NOTHING: "No Action",
  REPAY_FROM_BUFFER: "Repay from Buffer",
  REPAY_WITH_COLLATERAL: "Repay w/ Collateral",
  PARTIAL_DELEVERAGE: "Partial Deleverage",
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function ExecutionHistory({
  records,
}: {
  records: ExecutionRecord[];
}) {
  if (records.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Execution History</h2>
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
          {records.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {records.map((record) => (
          <div
            key={record.decisionId}
            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-800/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {ACTION_LABELS[record.action]}
                </span>
                <ExecutionStatusBadge status={record.status} />
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                <span>${record.executedAmountUsd.toLocaleString()}</span>
                {record.healthFactorBefore != null &&
                  record.healthFactorAfter != null && (
                    <span>
                      HF {record.healthFactorBefore.toFixed(2)} →{" "}
                      <span className="text-emerald-400">
                        {record.healthFactorAfter.toFixed(2)}
                      </span>
                    </span>
                  )}
                {record.txSignature && (
                  <a
                    href={`https://solscan.io/tx/${record.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    tx
                  </a>
                )}
              </div>
            </div>
            <span className="text-xs text-zinc-600 whitespace-nowrap">
              {timeAgo(record.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
