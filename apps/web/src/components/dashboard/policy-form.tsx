"use client";

import { useState } from "react";
import type { PolicyConfig, RiskProfile } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
    "Responds early with small repayments. Keeps position far from liquidation.",
  balanced:
    "Intervenes when there is a real threat. Balances cost and safety.",
  aggressive:
    "Holds off until the last moment, then acts with larger amounts.",
};

const PROFILE_LABELS: Record<RiskProfile, string> = {
  conservative: "Early & Gentle",
  balanced: "Smart Balance",
  aggressive: "Max Efficiency",
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

const SYNC_BADGE_MAP: Record<string, { label: string; variant: "success" | "info" | "danger" | "default" }> = {
  saved: { label: "Synced", variant: "success" },
  saving: { label: "Saving", variant: "info" },
  loading: { label: "Loading", variant: "info" },
  error: { label: "Error", variant: "danger" },
  idle: { label: "Local Draft", variant: "default" },
};

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const isActiveGuard = Boolean(policyAddress) && policy.enabled;

  const repayFromBufferEnabled = policy.allowedActions.includes("REPAY_FROM_BUFFER");

  const updatePolicy = <K extends keyof PolicyConfig>(key: K, value: PolicyConfig[K]) => {
    onChange({ ...policy, [key]: value });
  };

  const updateNumber = <K extends keyof PolicyConfig>(key: K, value: string, fallback: PolicyConfig[K]) => {
    const parsed = Number(value);
    updatePolicy(key, (Number.isFinite(parsed) ? parsed : fallback) as PolicyConfig[K]);
  };

  const applyRiskProfilePreset = (riskProfile: RiskProfile) => {
    onChange({ ...policy, riskProfile, ...PROFILE_PRESETS[riskProfile] });
  };

  const syncBadge = SYNC_BADGE_MAP[syncStatus] ?? SYNC_BADGE_MAP.idle;

  // ── Active Guard: compact summary card ──────────────────
  if (isActiveGuard) {
    return (
      <>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Policy</h3>
              <div className="flex items-center gap-2">
                <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)}>
                  Edit
                </Button>
              </div>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-4 gap-3">
              <SummaryStat label="Profile" value={PROFILE_LABELS[policy.riskProfile]} />
              <SummaryStat label="Target HF" value={policy.targetHealthFactor.toFixed(2)} />
              <SummaryStat label="Max/Action" value={`$${policy.maxRepayPerActionUsd}`} />
              <SummaryStat label="Cooldown" value={`${Math.round(policy.cooldownSeconds / 60)}min`} />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span>
                Actions: {policy.allowedActions.join(" · ")}
              </span>
              {policyAddress && (
                <span className="font-[family-name:var(--font-mono)]">
                  {shortenAddress(policyAddress)}
                </span>
              )}
            </div>

            {/* Pause Guard + sync error */}
            <div className="mt-4 flex items-center justify-between">
              {onPauseGuard && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={syncStatus === "saving"}
                  onClick={onPauseGuard}
                >
                  Pause Guard
                </Button>
              )}
              {syncError && (
                <p className="text-xs text-red-400">{syncError}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit Policy</SheetTitle>
              <SheetDescription>
                Change parameters and save on-chain.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5 overflow-y-auto">
              <PolicyFormFields
                policy={policy}
                repayFromBufferEnabled={repayFromBufferEnabled}
                applyRiskProfilePreset={applyRiskProfilePreset}
                updatePolicy={updatePolicy}
                updateNumber={updateNumber}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  disabled={syncDisabled || !onSyncOnChain || syncStatus === "saving"}
                  onClick={() => {
                    onSyncOnChain?.();
                    setSheetOpen(false);
                  }}
                  className="flex-1"
                >
                  {syncStatus === "saving" ? "Saving..." : "Update On-Chain"}
                </Button>
                <Button variant="outline" onClick={() => setSheetOpen(false)}>
                  Cancel
                </Button>
              </div>

              {syncError && (
                <p className="text-sm text-red-400">{syncError}</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ── Setup mode: full form ───────────────────────────────
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">AI Guard Policy</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Configure settings for AI-powered position protection.
            </p>
          </div>
          <Switch
            checked={policy.enabled}
            onCheckedChange={(checked) => updatePolicy("enabled", checked)}
            aria-label="Toggle AI Guard policy"
          />
        </div>

        <div className="mt-5 space-y-4">
          {!policy.enabled && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
              <p className="text-sm text-zinc-400">
                Configure the policy first, then enable the toggle to activate.
              </p>
            </div>
          )}

          <PolicyFormFields
            policy={policy}
            repayFromBufferEnabled={repayFromBufferEnabled}
            applyRiskProfilePreset={applyRiskProfilePreset}
            updatePolicy={updatePolicy}
            updateNumber={updateNumber}
          />
        </div>

        {/* On-chain section */}
        <div className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                On-Chain Policy
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {policyAddress
                  ? `Policy at ${shortenAddress(policyAddress)}`
                  : "Not yet deployed to Solana."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
              <Button
                disabled={syncDisabled || !onSyncOnChain || syncStatus === "saving"}
                onClick={onSyncOnChain}
                size="sm"
              >
                {syncStatus === "saving"
                  ? "Saving..."
                  : policyAddress && !policy.enabled
                    ? "Disable On-Chain"
                    : policyAddress
                      ? "Update On-Chain"
                      : policy.enabled
                        ? "Enable On-Chain"
                        : "Enable Policy First"}
              </Button>
            </div>
          </div>
          {syncError && (
            <p className="mt-2 text-sm text-red-400">{syncError}</p>
          )}
          {!policy.enabled && !policyAddress && (
            <p className="mt-2 text-xs text-zinc-500">
              Turn on the policy toggle to save it on-chain.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Shared form fields ─────────────────────────────────────

function PolicyFormFields({
  policy,
  repayFromBufferEnabled,
  applyRiskProfilePreset,
  updatePolicy,
  updateNumber,
}: {
  policy: PolicyConfig;
  repayFromBufferEnabled: boolean;
  applyRiskProfilePreset: (rp: RiskProfile) => void;
  updatePolicy: <K extends keyof PolicyConfig>(key: K, value: PolicyConfig[K]) => void;
  updateNumber: <K extends keyof PolicyConfig>(key: K, value: string, fallback: PolicyConfig[K]) => void;
}) {
  return (
    <>
      {/* Risk profile selector */}
      <div>
        <Label>Risk Profile</Label>
        <div className="mt-2 flex gap-2">
          {RISK_PROFILES.map((profile) => (
            <button
              key={profile.value}
              type="button"
              onClick={() => applyRiskProfilePreset(profile.value)}
              className={`flex flex-1 flex-col items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                policy.riskProfile === profile.value
                  ? "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <span>{profile.label}</span>
              <span className={`text-[10px] font-normal ${
                policy.riskProfile === profile.value ? "text-emerald-300/60" : "text-zinc-600"
              }`}>
                {profile.sub}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {PROFILE_DESCRIPTIONS[policy.riskProfile]}
        </p>
      </div>

      {/* Numeric fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Target Health Factor</Label>
          <Input
            type="number"
            min={1}
            step={0.01}
            value={policy.targetHealthFactor}
            onChange={(e) => updateNumber("targetHealthFactor", e.target.value, policy.targetHealthFactor)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max Repay / Action ($)</Label>
          <Input
            type="number"
            min={0}
            step={50}
            value={policy.maxRepayPerActionUsd}
            onChange={(e) => updateNumber("maxRepayPerActionUsd", e.target.value, policy.maxRepayPerActionUsd)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Daily Limit ($)</Label>
          <Input
            type="number"
            min={0}
            step={50}
            value={policy.maxDailyInterventionUsd}
            onChange={(e) => updateNumber("maxDailyInterventionUsd", e.target.value, policy.maxDailyInterventionUsd)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cooldown (min)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={Math.round(policy.cooldownSeconds / 60)}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              const nextMinutes = Number.isFinite(parsed)
                ? Math.max(0, parsed)
                : Math.round(policy.cooldownSeconds / 60);
              updatePolicy("cooldownSeconds", nextMinutes * 60);
            }}
          />
        </div>
      </div>

      {/* Allowed actions */}
      <div>
        <Label>Allowed Actions</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          <ActionTag label="Do Nothing" active />
          <ActionTag
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
          <ActionTag label="Repay with Collateral" active={false} disabled />
          <ActionTag label="Partial Deleverage" active={false} disabled />
        </div>
      </div>
    </>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-0.5 text-sm font-semibold font-[family-name:var(--font-mono)] tabular-nums">{value}</p>
    </div>
  );
}

function ActionTag({
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
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-600/15 text-emerald-400 ring-1 ring-emerald-500/20"
          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-zinc-600"}`}
    >
      {label}
    </button>
  );
}
