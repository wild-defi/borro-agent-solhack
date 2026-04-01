"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import ConnectWalletButton from "@/components/wallet/connect-wallet-button";
import PositionCard from "@/components/dashboard/position-card";
import PolicyForm from "@/components/dashboard/policy-form";
import BufferCard from "@/components/dashboard/buffer-card";
import AIDecisionCard from "@/components/dashboard/ai-decision-card";
import type { AgentStatus } from "@/components/dashboard/ai-decision-card";
import ExecutionHistory from "@/components/dashboard/execution-history";
import type {
  AIDecision,
  DecisionValidationResult,
  ExecutionRecord,
  PolicyConfig,
  PositionSnapshot,
} from "@/lib/types";

const DEFAULT_POLICY: PolicyConfig = {
  enabled: true,
  riskProfile: "balanced",
  targetHealthFactor: 1.25,
  allowedActions: ["DO_NOTHING", "REPAY_FROM_BUFFER"],
  maxRepayPerActionUsd: 500,
  maxDailyInterventionUsd: 1500,
  cooldownSeconds: 300,
};

function applyExecutionToSnapshot(
  snapshot: PositionSnapshot,
  execution: ExecutionRecord
): PositionSnapshot {
  if (
    execution.action !== "REPAY_FROM_BUFFER" ||
    execution.executedAmountUsd <= 0 ||
    execution.status === "failed" ||
    execution.status === "rejected"
  ) {
    return snapshot;
  }

  const nextDebtValueUsd = Number(
    Math.max(0, snapshot.debtValueUsd - execution.executedAmountUsd).toFixed(2)
  );
  const nextBufferUsd = Number(
    Math.max(0, snapshot.availableBufferUsd - execution.executedAmountUsd).toFixed(2)
  );
  const nextLtv =
    snapshot.collateralValueUsd > 0
      ? Number(((nextDebtValueUsd / snapshot.collateralValueUsd) * 100).toFixed(2))
      : 0;
  const nextHealthFactor =
    nextDebtValueUsd > 0
      ? Number(
          (
            (snapshot.collateralValueUsd * (snapshot.liquidationThreshold / 100)) /
            nextDebtValueUsd
          ).toFixed(2)
        )
      : 999;
  const nextDistanceToLiquidation = Number(
    (
      ((snapshot.liquidationThreshold - nextLtv) / snapshot.liquidationThreshold) *
      100
    ).toFixed(2)
  );

  return {
    ...snapshot,
    debtValueUsd: nextDebtValueUsd,
    availableBufferUsd: nextBufferUsd,
    ltv: nextLtv,
    healthFactor: nextHealthFactor,
    distanceToLiquidation: nextDistanceToLiquidation,
    timestamp: Date.now(),
  };
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [positionLoading, setPositionLoading] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] =
    useState<PositionSnapshot | null>(null);
  const [currentPolicy, setCurrentPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [currentRawDecision, setCurrentRawDecision] =
    useState<AIDecision | null>(null);
  const [currentDecision, setCurrentDecision] = useState<AIDecision | null>(
    null
  );
  const [currentValidation, setCurrentValidation] =
    useState<DecisionValidationResult | null>(null);
  const [currentExecution, setCurrentExecution] =
    useState<ExecutionRecord | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);

  const loadPosition = useCallback(async () => {
    if (!publicKey) {
      setCurrentSnapshot(null);
      return;
    }

    setPositionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/position?wallet=${publicKey.toBase58()}&mock=true`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load position");
        setCurrentSnapshot(null);
        return;
      }

      setCurrentSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load position");
      setCurrentSnapshot(null);
    } finally {
      setPositionLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setPositionLoading(false);
      setCurrentSnapshot(null);
      setCurrentRawDecision(null);
      setCurrentDecision(null);
      setCurrentValidation(null);
      setCurrentExecution(null);
      setExecutionHistory([]);
      setError(null);
      setAgentStatus("idle");
      return;
    }

    setCurrentDecision(null);
    setCurrentRawDecision(null);
    setCurrentValidation(null);
    setCurrentExecution(null);
    setExecutionHistory([]);
    setAgentStatus("idle");
    void loadPosition();
  }, [connected, publicKey, loadPosition]);

  const handleRunCheck = useCallback(async () => {
    if (!publicKey || !currentSnapshot) return;
    setAgentStatus("monitoring");
    setError(null);
    setCurrentExecution(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          snapshot: currentSnapshot,
          policy: currentPolicy,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to get AI decision");
        setAgentStatus("idle");
        return;
      }

      setCurrentSnapshot(data.snapshot);
      setCurrentRawDecision(data.rawDecision);
      setCurrentDecision(data.validatedDecision);
      setCurrentValidation(data.validation);
      setAgentStatus("decision_ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setAgentStatus("idle");
    }
  }, [publicKey, currentSnapshot, currentPolicy]);

  const handleExecute = useCallback(async () => {
    if (!publicKey || !currentSnapshot || !currentDecision) return;
    setAgentStatus("executing");
    setError(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          mock: true,
          snapshot: currentSnapshot,
          decision: currentDecision,
          policy: currentPolicy,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Execution failed");
        setAgentStatus("decision_ready");
        return;
      }

      const execution: ExecutionRecord = data.execution;
      setCurrentExecution(execution);
      setCurrentSnapshot((prev) =>
        prev ? applyExecutionToSnapshot(prev, execution) : prev
      );
      setExecutionHistory((prev) => [execution, ...prev]);
      setAgentStatus("executed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setAgentStatus("decision_ready");
    }
  }, [publicKey, currentSnapshot, currentDecision, currentPolicy]);

  const handlePolicyChange = useCallback((policy: PolicyConfig) => {
    setCurrentPolicy(policy);
    setAgentStatus("idle");
    setCurrentRawDecision(null);
    setCurrentDecision(null);
    setCurrentValidation(null);
    setCurrentExecution(null);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setAgentStatus("idle");
    setCurrentRawDecision(null);
    setCurrentDecision(null);
    setCurrentValidation(null);
    setCurrentExecution(null);
    setError(null);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Borro Agent</h1>
        <ConnectWalletButton />
      </header>

      {!connected ? (
        <div className="mt-32 text-center">
          <p className="text-lg text-zinc-400">
            Connect your wallet to view your lending position
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-zinc-500">
            Wallet: {publicKey?.toBase58().slice(0, 8)}...
            {publicKey?.toBase58().slice(-4)}
          </p>
          <PositionCard snapshot={currentSnapshot} loading={positionLoading} />
          <AIDecisionCard
            status={agentStatus}
            snapshot={currentSnapshot}
            policy={currentPolicy}
            rawDecision={currentRawDecision}
            decision={currentDecision}
            validation={currentValidation}
            execution={currentExecution}
            error={error}
            onRunCheck={handleRunCheck}
            onExecute={handleExecute}
            onReset={handleReset}
          />
          <PolicyForm policy={currentPolicy} onChange={handlePolicyChange} />
          <BufferCard snapshot={currentSnapshot} />
          <ExecutionHistory records={executionHistory} />
        </div>
      )}
    </div>
  );
}
