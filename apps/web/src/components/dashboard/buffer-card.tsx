"use client";

import type { PositionSnapshot } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BufferCard({
  snapshot,
  onDeposit,
  onWithdraw,
  disabled = false,
}: {
  snapshot?: PositionSnapshot | null;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  disabled?: boolean;
}) {
  const bufferBalance = snapshot?.availableBufferUsd ?? 0;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-base font-medium text-zinc-400">Safety Buffer</h3>
        <p className="mt-0.5 text-sm text-zinc-600">
          USDC reserve for fast debt repayment
        </p>

        <div className="mt-4">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-600">
            Available
          </p>
          <p className="mt-1 text-2xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
            ${bufferBalance.toLocaleString()}
            <span className="ml-1.5 text-sm font-normal text-zinc-500">USDC</span>
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !onWithdraw || bufferBalance <= 0}
            onClick={onWithdraw}
          >
            Withdraw
          </Button>
          <Button
            size="sm"
            disabled={disabled || !onDeposit}
            onClick={onDeposit}
          >
            Deposit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
