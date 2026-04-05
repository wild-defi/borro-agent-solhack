"use client";

import { useState } from "react";
import type { PolicyConfig, PolicyMode, PositionSnapshot, RiskProfile } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const MODE_OPTIONS: Array<{
  value: PolicyMode;
  label: string;
  tagline: string;
  description: string;
}> = [
  {
    value: "supervised",
    label: "Supervised",
    tagline: "You approve each action",
    description:
      "Best for demos where you want to review the decision first, then trigger the repay manually.",
  },
  {
    value: "autonomous",
    label: "Autonomous",
    tagline: "Borro acts in-session",
    description:
      "Best for showing the agent loop live. Borro checks on a short timer and can auto-execute while this tab stays open.",
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
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-mono)]">
          Set Up Borro Agent
        </h2>
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
                  i <= step ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  i === step ? "text-emerald-400" : i < step ? "text-zinc-400" : "text-zinc-600"
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
              onPolicyChange={onPolicyChange}
              onSyncOnChain={onSyncOnChain}
              onBack={() => setStep(1)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Step 1: Risk Profile ──────────────────── */

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
  onUpdateNumber: <K extends keyof PolicyConfig>(key: K, value: string, fallback: number) => void;
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
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isSelected ? "text-emerald-300" : "text-zinc-200"}`}>
                      {p.name}
                    </span>
                    <span className="text-xs text-zinc-500">{p.tagline}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{p.description}</p>
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fine-tune accordion */}
      <Collapsible open={fineTuneOpen} onOpenChange={onToggleFineTune}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="mt-4 flex w-full items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-400"
          >
            <span className={`transition-transform ${fineTuneOpen ? "rotate-90" : ""}`}>▸</span>
            Fine-tune parameters
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Health Factor</Label>
              <Input
                type="number"
                min={1}
                step={0.01}
                value={policy.targetHealthFactor}
                onChange={(e) => onUpdateNumber("targetHealthFactor", e.target.value, policy.targetHealthFactor)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Repay / Action ($)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={policy.maxRepayPerActionUsd}
                onChange={(e) => onUpdateNumber("maxRepayPerActionUsd", e.target.value, policy.maxRepayPerActionUsd)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Daily Limit ($)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={policy.maxDailyInterventionUsd}
                onChange={(e) => onUpdateNumber("maxDailyInterventionUsd", e.target.value, policy.maxDailyInterventionUsd)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cooldown (min)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={Math.round(policy.cooldownSeconds / 60)}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  const minutes = Number.isFinite(parsed)
                    ? Math.max(0, parsed)
                    : Math.round(policy.cooldownSeconds / 60);
                  onUpdateNumber("cooldownSeconds", String(minutes * 60), policy.cooldownSeconds);
                }}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button onClick={onNext} className="mt-6 w-full">
        Continue
      </Button>
    </div>
  );
}

/* ── Step 2: Safety Buffer ─────────────────── */

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
      <p className="text-sm font-medium text-zinc-300">Fund the safety buffer</p>
      <p className="mt-2 text-xs text-zinc-500">
        USDC reserve Borro uses to repay part of your debt when risk increases.
      </p>

      <div className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">Available</p>
        <p className="mt-1 text-3xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
          ${bufferBalance.toLocaleString()}
          <span className="ml-1.5 text-sm font-normal text-zinc-500">USDC</span>
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={bufferBalance <= 0}
            onClick={onWithdraw}
          >
            − $300
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDeposit}
            className="bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/20"
          >
            + $300
          </Button>
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Demo mode — adjusts in $300 steps.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="flex-1">Continue</Button>
      </div>
    </div>
  );
}

/* ── Step 3: Activate On-Chain ─────────────── */

function StepActivate({
  policy,
  policyAddress,
  syncStatus,
  syncError,
  syncDisabled,
  bufferBalance,
  onPolicyChange,
  onSyncOnChain,
  onBack,
}: {
  policy: PolicyConfig;
  policyAddress: string | null;
  syncStatus: "idle" | "loading" | "saving" | "saved" | "error";
  syncError: string | null;
  syncDisabled: boolean;
  bufferBalance: number;
  onPolicyChange: (policy: PolicyConfig) => void;
  onSyncOnChain: () => void;
  onBack: () => void;
}) {
  const profileLabel =
    PROFILES.find((p) => p.value === policy.riskProfile)?.name ?? policy.riskProfile;

  return (
    <div>
      <p className="text-sm font-medium text-zinc-300">Review & activate protection</p>
      <p className="mt-2 text-xs text-zinc-500">
        Policy saved on-chain. Agent starts monitoring immediately.
      </p>

      <div className="mt-5">
        <p className="text-sm font-medium text-zinc-300">Activation mode</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MODE_OPTIONS.map((mode) => {
            const active = policy.mode === mode.value;

            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => onPolicyChange({ ...policy, mode: mode.value })}
                className={`rounded-lg border px-4 py-4 text-left transition-colors ${
                  active
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        active ? "text-emerald-300" : "text-zinc-200"
                      }`}
                    >
                      {mode.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{mode.tagline}</p>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs text-zinc-500">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5 space-y-2">
        <SummaryRow
          label="Mode"
          value={policy.mode === "autonomous" ? "Autonomous" : "Supervised"}
        />
        <SummaryRow label="Risk Profile" value={profileLabel} />
        <SummaryRow label="Target HF" value={policy.targetHealthFactor.toFixed(2)} />
        <SummaryRow label="Max Repay / Action" value={`$${policy.maxRepayPerActionUsd}`} />
        <SummaryRow label="Daily Limit" value={`$${policy.maxDailyInterventionUsd}`} />
        <SummaryRow label="Cooldown" value={`${Math.round(policy.cooldownSeconds / 60)} min`} />
        <SummaryRow label="Safety Buffer" value={`$${bufferBalance}`} />
      </div>

      {bufferBalance <= 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400">
            Buffer is empty. The agent won&apos;t be able to repay until you fund it.
          </p>
        </div>
      )}

      {syncError && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">{syncError}</p>
        </div>
      )}

      {!policyAddress && !syncError && (
        <p className="mt-4 text-xs text-zinc-600">
          Requires a small amount of devnet SOL for rent and transaction fees.
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          disabled={syncDisabled || syncStatus === "saving"}
          onClick={onSyncOnChain}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500"
        >
          {syncStatus === "saving"
            ? "Signing..."
            : policyAddress
              ? "Update & Activate"
              : "Enable AI Guard On-Chain"}
        </Button>
      </div>
    </div>
  );
}

/* ── Shared ────────────────────────────────── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-4 py-2.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium font-[family-name:var(--font-mono)] tabular-nums text-zinc-200">{value}</span>
    </div>
  );
}
