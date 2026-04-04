"use client";

import type { PositionSnapshot } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function riskBadge(hf: number): { label: string; variant: "success" | "warning" | "danger" } {
  if (hf <= 1.1) return { label: "CRITICAL", variant: "danger" };
  if (hf <= 1.25) return { label: "AT RISK", variant: "warning" };
  return { label: "SAFE", variant: "success" };
}

function riskColor(hf: number) {
  if (hf <= 1.1) return "text-red-400";
  if (hf <= 1.25) return "text-amber-400";
  return "text-emerald-400";
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
            <p className="text-sm text-zinc-500">Loading position...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pos) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-zinc-500">No Kamino position found</p>
        </CardContent>
      </Card>
    );
  }

  const badge = riskBadge(pos.healthFactor);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400">Position</h3>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
      </CardContent>
    </Card>
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
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={`mt-1 text-lg font-semibold font-[family-name:var(--font-mono)] tabular-nums ${valueClass ?? "text-zinc-100"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}
