"use client";

import type { PolicyConfig, PositionSnapshot } from "@/lib/types";

interface SetupChecklistCardProps {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  policyAddress?: string | null;
  policyConfigured: boolean;
  bufferFunded: boolean;
}

function ChecklistItem({
  title,
  description,
  complete,
}: {
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3">
      <div
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          complete
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-zinc-700 text-zinc-500"
        }`}
      >
        {complete ? "✓" : "•"}
      </div>
      <div className="min-w-0">
        <p
          className={`text-sm font-medium ${
            complete ? "text-zinc-100" : "text-zinc-300"
          }`}
        >
          {title}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

export default function SetupChecklistCard({
  snapshot,
  policy,
  policyAddress,
  policyConfigured,
  bufferFunded,
}: SetupChecklistCardProps) {
  const positionDetected = Boolean(snapshot);
  const guardEnabled = Boolean(policyAddress) && policy.enabled;

  let nextStep = "Review the detected position to start configuring Borro.";

  if (!policyConfigured) {
    nextStep = "Enable the policy toggle and review the guardrails you want Borro to use.";
  } else if (!bufferFunded) {
    nextStep =
      "Fund the safety buffer so Borro can repay debt without selling collateral.";
  } else if (!guardEnabled) {
    nextStep =
      "Enable AI Guard on-chain to save this policy to Solana and start monitoring.";
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Set Up Borro Agent</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Complete these steps once. After that, this dashboard switches into
            active monitoring mode.
          </p>
        </div>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
          {guardEnabled ? "Ready" : "Setup"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <ChecklistItem
          title="Position detected"
          description={
            positionDetected
              ? "Borro found a lending position and can assess liquidation risk."
              : "Connect a wallet and load a Kamino position first."
          }
          complete={positionDetected}
        />
        <ChecklistItem
          title="Policy configured"
          description={
            policyConfigured
              ? "Risk profile and intervention limits are ready to be used."
              : "The guard policy is currently disabled."
          }
          complete={policyConfigured}
        />
        <ChecklistItem
          title="Safety buffer funded"
          description={
            bufferFunded
              ? `Buffer has $${(snapshot?.availableBufferUsd ?? 0).toLocaleString()} available for fast repay.`
              : "No repayment buffer is available yet."
          }
          complete={bufferFunded}
        />
        <ChecklistItem
          title="AI Guard enabled on-chain"
          description={
            guardEnabled
              ? "The current policy is live on Solana and tied to this position."
              : "Save the policy on-chain to activate monitoring."
          }
          complete={guardEnabled}
        />
      </div>

      <div className="mt-5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-300">
          Next Step
        </p>
        <p className="mt-2 text-sm text-zinc-300">{nextStep}</p>
      </div>
    </div>
  );
}
