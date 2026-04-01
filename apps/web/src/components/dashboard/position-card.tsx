"use client";

import type { PositionSnapshot } from "@/lib/types";

function riskColor(hf: number) {
  if (hf <= 1.1) return "text-red-400";
  if (hf <= 1.25) return "text-amber-400";
  return "text-emerald-400";
}

function riskBadge(hf: number) {
  if (hf <= 1.1) return { label: "CRITICAL", bg: "bg-red-500/20 text-red-400" };
  if (hf <= 1.25) return { label: "AT RISK", bg: "bg-amber-500/20 text-amber-400" };
  return { label: "SAFE", bg: "bg-emerald-500/20 text-emerald-400" };
}

export default function PositionCard({
  snapshot,
  loading = false,
}: {
  snapshot?: PositionSnapshot | null;
  loading?: boolean;
}) {
  const pos = snapshot ?? null;

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-zinc-500">Loading position...</p>
      </div>
    );
  }

  if (!pos) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-zinc-500">No Kamino position found</p>
      </div>
    );
  }

  const badge = riskBadge(pos.healthFactor);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kamino Position</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Collateral"
          value={`$${pos.collateralValueUsd.toLocaleString()}`}
          sub={pos.collateralAsset}
        />
        <Stat
          label="Debt"
          value={`$${pos.debtValueUsd.toLocaleString()}`}
          sub={pos.debtAsset}
        />
        <Stat
          label="LTV"
          value={`${pos.ltv.toFixed(1)}%`}
          sub={`liq at ${pos.liquidationThreshold}%`}
        />
        <Stat
          label="Health Factor"
          value={pos.healthFactor.toFixed(2)}
          sub={`${pos.distanceToLiquidation.toFixed(1)}% to liq`}
          valueClass={riskColor(pos.healthFactor)}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass ?? "text-zinc-100"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
