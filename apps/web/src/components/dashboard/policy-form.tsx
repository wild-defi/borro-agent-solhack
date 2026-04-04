"use client";

import type { PolicyConfig, RiskProfile } from "@/lib/types";

const RISK_PROFILES: Array<{ value: RiskProfile; label: string; sub: string }> = [
  { value: "conservative", label: "Early & Gentle", sub: "Conservative" },
  { value: "balanced", label: "Smart Balance", sub: "Balanced" },
  { value: "aggressive", label: "Max Efficiency", sub: "Aggressive" },
];

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

const PROFILE_DESCRIPTIONS: Record<RiskProfile, string> = {
  conservative:
    "Responds at the first signs of risk with small repayments. Higher frequency, keeps position far from liquidation.",
  balanced:
    "Intervenes when there is a real threat. Optimal repayment amounts that balance cost and safety.",
  aggressive:
    "Holds off until the last reasonable moment, then acts with larger amounts. Cheaper overall, but tolerates more risk.",
};

interface PolicyFormProps {
  policy: PolicyConfig;
  onChange: (policy: PolicyConfig) => void;
  policyAddress?: string | null;
  syncStatus?: "idle" | "loading" | "saving" | "saved" | "error";
  syncError?: string | null;
  syncDisabled?: boolean;
  onSyncOnChain?: () => void;
  onPauseGuard?: () => void;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function PolicyForm({
  policy,
  onChange,
  policyAddress = null,
  syncStatus = "idle",
  syncError = null,
  syncDisabled = false,
  onSyncOnChain,
  onPauseGuard,
}: PolicyFormProps) {
  const repayFromBufferEnabled = policy.allowedActions.includes(
    "REPAY_FROM_BUFFER"
  );

  const updatePolicy = <K extends keyof PolicyConfig>(
    key: K,
    value: PolicyConfig[K]
  ) => {
    onChange({ ...policy, [key]: value });
  };

  const updateNumber = <K extends keyof PolicyConfig>(
    key: K,
    value: string,
    fallback: PolicyConfig[K]
  ) => {
    const parsed = Number(value);
    updatePolicy(key, (Number.isFinite(parsed) ? parsed : fallback) as PolicyConfig[K]);
  };

  const applyRiskProfilePreset = (riskProfile: RiskProfile) => {
    onChange({
      ...policy,
      riskProfile,
      ...PROFILE_PRESETS[riskProfile],
    });
  };

  const isActiveGuard = Boolean(policyAddress) && policy.enabled;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Guard Policy</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isActiveGuard
              ? "Edit parameters and sync changes on-chain."
              : "These settings are applied to the next AI check and execution."}
          </p>
        </div>
        {!isActiveGuard && (
          <button
            type="button"
            onClick={() => updatePolicy("enabled", !policy.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              policy.enabled ? "bg-indigo-600" : "bg-zinc-700"
            }`}
            aria-pressed={policy.enabled}
            aria-label="Toggle AI Guard policy"
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                policy.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {!policy.enabled && !isActiveGuard && (
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
            <p className="text-sm text-zinc-400">
              Configure the policy first, then turn the toggle on when you want
              Borro to treat it as an active guard configuration.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm text-zinc-400">Risk Profile</label>
          <div className="mt-2 flex gap-2">
            {RISK_PROFILES.map((profile) => (
              <button
                key={profile.value}
                type="button"
                onClick={() => applyRiskProfilePreset(profile.value)}
                className={`flex flex-col items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  policy.riskProfile === profile.value
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                <span>{profile.label}</span>
                <span className={`text-[10px] font-normal ${policy.riskProfile === profile.value ? "text-indigo-200" : "text-zinc-600"}`}>
                  {profile.sub}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {PROFILE_DESCRIPTIONS[policy.riskProfile]}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Target Health Factor"
            type="number"
            min={1}
            step={0.01}
            value={policy.targetHealthFactor}
            onChange={(value) =>
              updateNumber("targetHealthFactor", value, policy.targetHealthFactor)
            }
          />
          <Field
            label="Max Repay per Action ($)"
            type="number"
            min={0}
            step={50}
            value={policy.maxRepayPerActionUsd}
            onChange={(value) =>
              updateNumber(
                "maxRepayPerActionUsd",
                value,
                policy.maxRepayPerActionUsd
              )
            }
          />
          <Field
            label="Max Daily Intervention ($)"
            type="number"
            min={0}
            step={50}
            value={policy.maxDailyInterventionUsd}
            onChange={(value) =>
              updateNumber(
                "maxDailyInterventionUsd",
                value,
                policy.maxDailyInterventionUsd
              )
            }
          />
          <Field
            label="Cooldown (minutes)"
            type="number"
            min={0}
            step={1}
            value={Math.round(policy.cooldownSeconds / 60)}
            onChange={(value) => {
              const parsed = Number(value);
              const nextMinutes = Number.isFinite(parsed)
                ? Math.max(0, parsed)
                : Math.round(policy.cooldownSeconds / 60);
              updatePolicy("cooldownSeconds", nextMinutes * 60);
            }}
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Allowed Actions</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Tag label="Do Nothing" active />
            <Tag
              label="Repay from Buffer"
              active={repayFromBufferEnabled}
              onClick={() =>
                updatePolicy(
                  "allowedActions",
                  repayFromBufferEnabled
                    ? ["DO_NOTHING"]
                    : ["DO_NOTHING", "REPAY_FROM_BUFFER"]
                )
              }
            />
            <Tag label="Repay with Collateral" active={false} disabled />
            <Tag label="Partial Deleverage" active={false} disabled />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Current MVP supports `DO_NOTHING` and `REPAY_FROM_BUFFER`.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              On-Chain Policy
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {policyAddress
                ? `Policy live at ${shortenAddress(policyAddress)}`
                : "Policy is still local. Enable it on Solana to bind it to this position."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PolicySyncBadge status={syncStatus} />
            {isActiveGuard && onPauseGuard && (
              <button
                type="button"
                disabled={syncStatus === "saving"}
                onClick={onPauseGuard}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
              >
                Pause Guard
              </button>
            )}
            <button
              type="button"
              disabled={syncDisabled || !onSyncOnChain || syncStatus === "saving"}
              onClick={onSyncOnChain}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {syncStatus === "saving"
                ? "Saving..."
                : policyAddress && !policy.enabled
                  ? "Disable On-Chain Policy"
                : policyAddress
                  ? "Update On-Chain Policy"
                  : policy.enabled
                    ? "Enable AI Guard On-Chain"
                    : "Turn On Policy to Save"}
            </button>
          </div>
        </div>
        {syncError ? (
          <p className="mt-2 text-sm text-red-400">{syncError}</p>
        ) : policyAddress && !policy.enabled ? (
          <p className="mt-2 text-sm text-zinc-500">
            Saving now will keep the policy account on Solana but deactivate the
            guard, so you can go back through setup and re-enable it later.
          </p>
        ) : !policy.enabled ? (
          <p className="mt-2 text-sm text-zinc-500">
            Turn on the policy toggle first. That marks the policy as active and
            lets you save it on-chain.
          </p>
        ) : !policyAddress ? (
          <p className="mt-2 text-sm text-zinc-500">
            You need a small amount of devnet SOL in the connected wallet to
            create the on-chain policy account.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PolicySyncBadge({
  status,
}: {
  status: "idle" | "loading" | "saving" | "saved" | "error";
}) {
  const content =
    status === "saved"
      ? { label: "Synced", className: "bg-emerald-500/20 text-emerald-400" }
      : status === "saving"
        ? { label: "Saving", className: "bg-indigo-500/20 text-indigo-400" }
        : status === "loading"
          ? { label: "Loading", className: "bg-blue-500/20 text-blue-400" }
          : status === "error"
            ? { label: "Error", className: "bg-red-500/20 text-red-400" }
            : { label: "Local Draft", className: "bg-zinc-700/40 text-zinc-400" };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${content.className}`}>
      {content.label}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  type: "number";
  min?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}

function Tag({
  label,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const baseClass = active
    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
    : "bg-zinc-800 text-zinc-500 border border-zinc-700";
  const interactiveClass = disabled
    ? "cursor-not-allowed opacity-60"
    : "cursor-pointer hover:border-zinc-600";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${baseClass} ${interactiveClass}`}
    >
      {label}
    </button>
  );
}
