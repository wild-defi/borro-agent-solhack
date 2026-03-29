"use client";

import { useState } from "react";

const RISK_PROFILES = ["Conservative", "Balanced", "Aggressive"] as const;

export default function PolicyForm() {
  const [enabled, setEnabled] = useState(false);
  const [profile, setProfile] = useState<(typeof RISK_PROFILES)[number]>("Balanced");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Guard Policy</h2>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-indigo-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Risk Profile</label>
            <div className="mt-2 flex gap-2">
              {RISK_PROFILES.map((p) => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    profile === p
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Target Health Factor" defaultValue="1.30" />
            <Field label="Max Repay per Action ($)" defaultValue="500" />
            <Field label="Max Daily Intervention ($)" defaultValue="2000" />
            <Field label="Cooldown (minutes)" defaultValue="15" />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Allowed Actions</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Tag label="Repay from Buffer" active />
              <Tag label="Repay with Collateral" active={false} />
              <Tag label="Partial Deleverage" active={false} />
            </div>
          </div>

          <button className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500">
            Save Policy On-Chain
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}

function Tag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
        active
          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
          : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
      }`}
    >
      {label}
    </span>
  );
}
