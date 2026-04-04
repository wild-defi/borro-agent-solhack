"use client";

import { useState } from "react";
import type { PolicyConfig, PositionSnapshot, RiskProfile } from "@/lib/types";

const PROFILE_PRESETS: Record<
  RiskProfile,
  Pick<
    PolicyConfig,
    | "targetHealthFactor"
    | "maxRepayPerActionUsd"
    | "maxDailyInterventionUsd"
    | "cooldownSeconds"
  >
> = {
  conservative: {
    targetHealthFactor: 1.35,
    maxRepayPerActionUsd: 700,
    maxDailyInterventionUsd: 2500,
    cooldownSeconds: 300,
  },
  balanced: {
    targetHealthFactor: 1.25,
    maxRepayPerActionUsd: 500,
    maxDailyInterventionUsd: 1500,
    cooldownSeconds: 300,
  },
  aggressive: {
    targetHealthFactor: 1.15,
    maxRepayPerActionUsd: 300,
    maxDailyInterventionUsd: 900,
    cooldownSeconds: 900,
  },
};

const PROFILES: Array<{
  value: RiskProfile;
  name: string;
  tagline: string;
  description: string;
  icon: string;
}> = [
  {
    value: "conservative",
    name: "Early & Gentle",
    tagline: "React early, repay small",
    description:
      "Responds at the first signs of risk with small repayments. Higher frequency, but keeps the position far from liquidation at all times.",
    icon: "🛡",
  },
  {
    value: "balanced",
    name: "Smart Balance",
    tagline: "Act when it matters",
    description:
      "Intervenes when there is a real threat to the position. Optimal repayment amounts that balance cost and safety.",
    icon: "⚖️",
  },
  {
    value: "aggressive",
    name: "Max Efficiency",
    tagline: "Wait longer, act bigger",
    description:
      "Holds off until the last reasonable moment, then acts with larger amounts. Cheaper overall, but tolerates more risk.",
    icon: "⚡",
  },
];

interface SetupWizardProps {
  snapshot: PositionSnapshot | null;
  policy: PolicyConfig;
  policyAddress: string | null;
  syncStatus: "idle" | "loading" | "saving" | "saved" | "error";
  syncError: string | null;
  syncDisabled: boolean;
  onPolicyChange: (policy: PolicyConfig) => void;
  onSyncOnChain: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export default function SetupWizard({
  snapshot,
  policy,
  policyAddress,
  syncStatus,
  syncError,
  syncDisabled,
  onPolicyChange,
  onSyncOnChain,
  onDeposit,
  onWithdraw,
}: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [fineTuneOpen, setFineTuneOpen] = useState(false);

  const bufferBalance = snapshot?.availableBufferUsd ?? 0;

  const applyPreset = (profile: RiskProfile) => {
    onPolicyChange({
      ...policy,
      riskProfile: profile,
      allowedActions: ["DO_NOTHING", "REPAY_FROM_BUFFER"],
      ...PROFILE_PRESETS[profile],
    });
  };

  const updateNumber = <K extends keyof PolicyConfig>(
    key: K,
    value: string,
    fallback: number
  ) => {
    const parsed = Number(value);
    onPolicyChange({
      ...policy,
      [key]: Number.isFinite(parsed) ? parsed : fallback,
    });
  };

  const steps = [
    { label: "Risk Profile", short: "Profile" },
    { label: "Safety Buffer", short: "Buffer" },
    { label: "Activate", short: "Activate" },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Header */}
      <h2 className="text-lg font-semibold">Set Up Borro Agent</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Configure protection in 3 steps. After that, the dashboard switches to
        active monitoring.
      </p>

      {/* Progress bar */}
      <div className="mt-5 flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 w-full rounded-full transition-colors ${
                i <= step ? "bg-indigo-500" : "bg-zinc-700"
              }`}
            />
            <span
              className={`text-[11px] font-medium ${
                i === step ? "text-indigo-400" : i < step ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              {s.short}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mt-6">
        {step === 0 && (
          <StepProfile
            selected={policy.riskProfile}
            onSelect={applyPreset}
            policy={policy}
            fineTuneOpen={fineTuneOpen}
            onToggleFineTune={() => setFineTuneOpen(!fineTuneOpen)}
            onUpdateNumber={updateNumber}
            onNext={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <StepBuffer
            bufferBalance={bufferBalance}
            onDeposit={onDeposit}
            onWithdraw={onWithdraw}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepActivate
            policy={policy}
            policyAddress={policyAddress}
            syncStatus={syncStatus}
            syncError={syncError}
            syncDisabled={syncDisabled}
            bufferBalance={bufferBalance}
            onSyncOnChain={onSyncOnChain}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 1: Risk Profile
   ──────────────────────────────────────────── */

function StepProfile({
  selected,
  onSelect,
  policy,
  fineTuneOpen,
  onToggleFineTune,
  onUpdateNumber,
  onNext,
}: {
  selected: RiskProfile;
  onSelect: (profile: RiskProfile) => void;
  policy: PolicyConfig;
  fineTuneOpen: boolean;
  onToggleFineTune: () => void;
  onUpdateNumber: <K extends keyof PolicyConfig>(
    key: K,
    value: string,
    fallback: number
  ) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-zinc-300">
        How should Borro protect your position?
      </p>

      <div className="mt-4 space-y-3">
        {PROFILES.map((p) => {
          const isSelected = selected === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onSelect(p.value)}
              className={`w-full rounded-lg border px-4 py-4 text-left transition-colors ${
                isSelected
                  ? "border-indigo-500/50 bg-indigo-500/10"
                  : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? "text-indigo-300" : "text-zinc-200"
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className="text-xs text-zinc-500">{p.tagline}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{p.description}</p>
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[11px] text-white">
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fine-tune accordion */}
      <button
        type="button"
        onClick={onToggleFineTune}
        className="mt-4 flex w-full items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-400"
      >
        <span
          className={`transition-transform ${fineTuneOpen ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        Fine-tune parameters
      </button>

      {fineTuneOpen && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumberField
            label="Target Health Factor"
            value={policy.targetHealthFactor}
            min={1}
            step={0.01}
            onChange={(v) =>
              onUpdateNumber("targetHealthFactor", v, policy.targetHealthFactor)
            }
          />
          <NumberField
            label="Max Repay per Action ($)"
            value={policy.maxRepayPerActionUsd}
            min={0}
            step={50}
            onChange={(v) =>
              onUpdateNumber(
                "maxRepayPerActionUsd",
                v,
                policy.maxRepayPerActionUsd
              )
            }
          />
          <NumberField
            label="Max Daily Intervention ($)"
            value={policy.maxDailyInterventionUsd}
            min={0}
            step={50}
            onChange={(v) =>
              onUpdateNumber(
                "maxDailyInterventionUsd",
                v,
                policy.maxDailyInterventionUsd
              )
            }
          />
          <NumberField
            label="Cooldown (minutes)"
            value={Math.round(policy.cooldownSeconds / 60)}
            min={0}
            step={1}
            onChange={(v) => {
              const parsed = Number(v);
              const minutes = Number.isFinite(parsed)
                ? Math.max(0, parsed)
                : Math.round(policy.cooldownSeconds / 60);
              onUpdateNumber(
                "cooldownSeconds",
                String(minutes * 60),
                policy.cooldownSeconds
              );
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Continue
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 2: Safety Buffer
   ──────────────────────────────────────────── */

function StepBuffer({
  bufferBalance,
  onDeposit,
  onWithdraw,
  onBack,
  onNext,
}: {
  bufferBalance: number;
  onDeposit: () => void;
  onWithdraw: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-zinc-300">
        Fund the safety buffer
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        This is the USDC reserve Borro uses to repay part of your debt when risk
        increases. The larger the buffer, the more room the agent has to protect
        you.
      </p>

      <div className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-5 py-5">
        <p className="text-xs text-zinc-500">Available</p>
        <p className="mt-1 text-3xl font-semibold">
          ${bufferBalance.toLocaleString()}{" "}
          <span className="text-sm font-normal text-zinc-500">USDC</span>
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={bufferBalance <= 0}
            onClick={onWithdraw}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
          >
            − $300
          </button>
          <button
            type="button"
            onClick={onDeposit}
            className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-600/30"
          >
            + $300
          </button>
        </div>

        <p className="mt-3 text-[11px] text-zinc-600">
          Demo mode — adjusts in $300 steps.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 3: Activate On-Chain
   ──────────────────────────────────────────── */

function StepActivate({
  policy,
  policyAddress,
  syncStatus,
  syncError,
  syncDisabled,
  bufferBalance,
  onSyncOnChain,
  onBack,
}: {
  policy: PolicyConfig;
  policyAddress: string | null;
  syncStatus: "idle" | "loading" | "saving" | "saved" | "error";
  syncError: string | null;
  syncDisabled: boolean;
  bufferBalance: number;
  onSyncOnChain: () => void;
  onBack: () => void;
}) {
  const profileLabel =
    PROFILES.find((p) => p.value === policy.riskProfile)?.name ?? policy.riskProfile;

  return (
    <div>
      <p className="text-sm font-medium text-zinc-300">
        Review & activate protection
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Your policy will be saved on-chain and the agent will start monitoring
        your position.
      </p>

      {/* Summary */}
      <div className="mt-5 space-y-2">
        <SummaryRow label="Risk Profile" value={profileLabel} />
        <SummaryRow
          label="Target Health Factor"
          value={policy.targetHealthFactor.toFixed(2)}
        />
        <SummaryRow
          label="Max Repay / Action"
          value={`$${policy.maxRepayPerActionUsd}`}
        />
        <SummaryRow
          label="Daily Limit"
          value={`$${policy.maxDailyInterventionUsd}`}
        />
        <SummaryRow
          label="Cooldown"
          value={`${Math.round(policy.cooldownSeconds / 60)} min`}
        />
        <SummaryRow label="Safety Buffer" value={`$${bufferBalance}`} />
      </div>

      {/* Warnings */}
      {bufferBalance <= 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400">
            Buffer is empty. The agent won&apos;t be able to repay debt until you
            fund it. You can still activate and add funds later.
          </p>
        </div>
      )}

      {/* Error */}
      {syncError && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">{syncError}</p>
        </div>
      )}

      {/* Devnet SOL note */}
      {!policyAddress && !syncError && (
        <p className="mt-4 text-[11px] text-zinc-600">
          Requires a small amount of devnet SOL for rent and transaction fees.
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
        >
          Back
        </button>
        <button
          type="button"
          disabled={syncDisabled || syncStatus === "saving"}
          onClick={onSyncOnChain}
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {syncStatus === "saving"
            ? "Signing..."
            : policyAddress
              ? "Update & Activate"
              : "Enable AI Guard On-Chain"}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Shared UI pieces
   ──────────────────────────────────────────── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-4 py-2.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
