"use client";

import type { PositionSnapshot } from "@/lib/types";

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
  const bufferAsset = "USDC";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold">Safety Buffer</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Reserve USDC for fast repayment without selling collateral
      </p>


      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-zinc-500">Available</p>
          <p className="mt-1 text-2xl font-semibold">
            ${bufferBalance.toLocaleString()}{" "}
            <span className="text-sm text-zinc-500">{bufferAsset}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled || !onWithdraw || bufferBalance <= 0}
            onClick={onWithdraw}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
          >
            Withdraw
          </button>
          <button
            type="button"
            disabled={disabled || !onDeposit}
            onClick={onDeposit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
}
