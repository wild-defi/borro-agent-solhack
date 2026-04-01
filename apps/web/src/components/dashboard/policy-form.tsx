"use client";

import type { PolicyConfig, RiskProfile } from "@/lib/types";

const RISK_PROFILES: Array<{ value: RiskProfile; label: string }> = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
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
    "Intervene earlier, repay more aggressively, and keep the position further from liquidation.",
  balanced:
    "Use moderate limits and intervene when the position starts moving meaningfully toward liquidation.",
  aggressive:
    "Allow tighter risk, intervene later, and preserve buffer for more extreme market moves.",
};

interface PolicyFormProps {
  policy: PolicyConfig;
  onChange: (policy: PolicyConfig) => void;
}

export default function PolicyForm({ policy, onChange }: PolicyFormProps) {
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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Guard Policy</h2>
          <p className="mt-1 text-sm text-zinc-500">
            These settings are applied to the next AI check and execution.
          </p>
        </div>
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
      </div>

      {policy.enabled ? (
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Risk Profile</label>
            <div className="mt-2 flex gap-2">
              {RISK_PROFILES.map((profile) => (
                <button
                  key={profile.value}
                  type="button"
                  onClick={() => applyRiskProfilePreset(profile.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    policy.riskProfile === profile.value
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {profile.label}
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
      ) : (
        <div className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
          <p className="text-sm text-zinc-400">
            AI Guard is disabled. Checks will still run, but guardrails will
            block automated intervention until you enable the policy again.
          </p>
        </div>
      )}
    </div>
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
