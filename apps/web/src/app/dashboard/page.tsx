"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import ConnectWalletButton from "@/components/wallet/connect-wallet-button";
import PositionCard from "@/components/dashboard/position-card";
import PolicyForm from "@/components/dashboard/policy-form";
import BufferCard from "@/components/dashboard/buffer-card";
import AIDecisionCard from "@/components/dashboard/ai-decision-card";
import SetupWizard from "@/components/dashboard/setup-wizard";
import AgentStatusCard from "@/components/dashboard/agent-status-card";
import type { AgentStatus } from "@/components/dashboard/ai-decision-card";
import ExecutionHistory from "@/components/dashboard/execution-history";
import {
  fetchPolicyConfig,
  initializePolicyOnChain,
  type BorroClientConfig,
  updatePolicyOnChain,
} from "@/lib/solana/borro-program-client";
import type {
  AIDecision,
  DecisionValidationResult,
  ExecutionRecord,
  PolicyConfig,
  PositionSnapshot,
} from "@/lib/types";

const DEFAULT_POLICY: PolicyConfig = {
  enabled: false,
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
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [positionLoading, setPositionLoading] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] =
    useState<PositionSnapshot | null>(null);
  const [borroConfig, setBorroConfig] = useState<BorroClientConfig | null>(null);
  const [currentPolicy, setCurrentPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [currentPolicyAddress, setCurrentPolicyAddress] = useState<string | null>(
    null
  );
  const [policySyncStatus, setPolicySyncStatus] = useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [policySyncError, setPolicySyncError] = useState<string | null>(null);
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
  const hasOnChainPolicy = Boolean(currentPolicyAddress);
  const isGuardActive = hasOnChainPolicy && currentPolicy.enabled;
  const isPolicyConfigured = currentPolicy.enabled;
  const hasFundedBuffer = (currentSnapshot?.availableBufferUsd ?? 0) > 0;

  const resetAssessmentState = useCallback(() => {
    setAgentStatus("idle");
    setCurrentRawDecision(null);
    setCurrentDecision(null);
    setCurrentValidation(null);
    setCurrentExecution(null);
    setError(null);
  }, []);

  const loadBorroConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/borro/config");
      const data = (await response.json()) as BorroClientConfig & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load Borro config");
      }

      setBorroConfig(data);
      setPolicySyncError(null);
    } catch (err) {
      setBorroConfig(null);
      setPolicySyncStatus("error");
      setPolicySyncError(
        err instanceof Error ? err.message : "Failed to load Borro config"
      );
    }
  }, []);

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

  const loadOnChainPolicy = useCallback(
    async (obligationAddress: string) => {
      if (!anchorWallet || !publicKey) {
        return;
      }

      setPolicySyncStatus("loading");
      setPolicySyncError(null);

      try {
        const record = await fetchPolicyConfig(
          connection,
          anchorWallet,
          publicKey.toBase58(),
          obligationAddress
        );

        if (record) {
          setCurrentPolicy(record.policy);
          setCurrentPolicyAddress(record.policyAddress);
          setPolicySyncStatus("saved");
          return;
        }

        setCurrentPolicy(DEFAULT_POLICY);
        setCurrentPolicyAddress(null);
        setPolicySyncStatus("idle");
      } catch (err) {
        setCurrentPolicyAddress(null);
        setPolicySyncStatus("error");
        setPolicySyncError(
          err instanceof Error ? err.message : "Failed to load on-chain policy"
        );
      }
    },
    [anchorWallet, connection, publicKey]
  );

  useEffect(() => {
    void loadBorroConfig();
  }, [loadBorroConfig]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setPositionLoading(false);
      setCurrentSnapshot(null);
      setCurrentPolicy(DEFAULT_POLICY);
      setCurrentPolicyAddress(null);
      setPolicySyncStatus("idle");
      setPolicySyncError(null);
      setExecutionHistory([]);
      resetAssessmentState();
      return;
    }

    resetAssessmentState();
    setExecutionHistory([]);
    void loadPosition();
  }, [connected, publicKey, loadPosition, resetAssessmentState]);

  useEffect(() => {
    if (!connected || !publicKey || !anchorWallet) {
      return;
    }

    const obligationAddress = currentSnapshot?.obligationAddress;

    if (!obligationAddress) {
      return;
    }

    void loadOnChainPolicy(obligationAddress);
  }, [
    anchorWallet,
    connected,
    currentSnapshot?.obligationAddress,
    loadOnChainPolicy,
    publicKey,
  ]);

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
    if (!publicKey || !currentSnapshot || !currentDecision || !isGuardActive) {
      return;
    }
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
          policyAddress: currentPolicyAddress ?? undefined,
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
  }, [
    publicKey,
    currentSnapshot,
    currentDecision,
    currentPolicy,
    currentPolicyAddress,
    isGuardActive,
  ]);

  const handlePolicyChange = useCallback((policy: PolicyConfig) => {
    setCurrentPolicy(policy);
    setPolicySyncStatus("idle");
    setPolicySyncError(null);
    resetAssessmentState();
  }, [resetAssessmentState]);

  const syncPolicyOnChain = useCallback(async (policyToSync: PolicyConfig) => {
    if (!anchorWallet || !publicKey || !currentSnapshot?.obligationAddress) {
      setPolicySyncStatus("error");
      setPolicySyncError(
        "Connect a wallet and load a position before enabling AI Guard on-chain."
      );
      return;
    }

    if (!borroConfig) {
      setPolicySyncStatus("error");
      setPolicySyncError("Borro config is unavailable.");
      return;
    }

    setPolicySyncStatus("saving");
    setPolicySyncError(null);

    try {
      if (currentPolicyAddress) {
        await updatePolicyOnChain({
          connection,
          wallet: anchorWallet,
          policyAddress: currentPolicyAddress,
          config: borroConfig,
          policy: policyToSync,
        });
      } else {
        const result = await initializePolicyOnChain({
          connection,
          wallet: anchorWallet,
          obligationAddress: currentSnapshot.obligationAddress,
          config: borroConfig,
          policy: policyToSync,
        });
        setCurrentPolicyAddress(result.policyAddress);
      }

      await loadOnChainPolicy(currentSnapshot.obligationAddress);
      setPolicySyncStatus("saved");
    } catch (err) {
      setPolicySyncStatus("error");
      setPolicySyncError(
        err instanceof Error ? err.message : "Failed to sync policy on-chain"
      );
    }
  }, [
    anchorWallet,
    borroConfig,
    connection,
    currentPolicyAddress,
    currentSnapshot?.obligationAddress,
    loadOnChainPolicy,
    publicKey,
  ]);

  const handleSyncPolicyOnChain = useCallback(async () => {
    await syncPolicyOnChain(currentPolicy);
  }, [currentPolicy, syncPolicyOnChain]);

  const handleActivateGuard = useCallback(async () => {
    const enabledPolicy = { ...currentPolicy, enabled: true };
    setCurrentPolicy(enabledPolicy);
    await syncPolicyOnChain(enabledPolicy);
  }, [currentPolicy, syncPolicyOnChain]);

  const handlePauseGuard = useCallback(async () => {
    const pausedPolicy = { ...currentPolicy, enabled: false };
    setCurrentPolicy(pausedPolicy);
    await syncPolicyOnChain(pausedPolicy);
    resetAssessmentState();
  }, [currentPolicy, syncPolicyOnChain, resetAssessmentState]);

  const handleDepositBuffer = useCallback(() => {
    setCurrentSnapshot((prev) =>
      prev
        ? {
            ...prev,
            availableBufferUsd: Number(
              (prev.availableBufferUsd + 300).toFixed(2)
            ),
            timestamp: Date.now(),
          }
        : prev
    );
    resetAssessmentState();
  }, [resetAssessmentState]);

  const handleWithdrawBuffer = useCallback(() => {
    setCurrentSnapshot((prev) =>
      prev
        ? {
            ...prev,
            availableBufferUsd: Number(
              Math.max(0, prev.availableBufferUsd - 300).toFixed(2)
            ),
            timestamp: Date.now(),
          }
        : prev
    );
    resetAssessmentState();
  }, [resetAssessmentState]);

  const handleReset = useCallback(() => {
    resetAssessmentState();
  }, [resetAssessmentState]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-[family-name:var(--font-mono)] tracking-tight">
          Borro<span className="text-emerald-400">.</span>
        </h1>
        <ConnectWalletButton />
      </header>

      {!connected ? (
        <div className="mt-32 text-center">
          <p className="text-lg text-zinc-400">
            Connect your wallet to view your lending position
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <p className="text-xs text-zinc-600 font-[family-name:var(--font-mono)]">
            {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-4)}
          </p>

          {!isGuardActive ? (
            <>
              <PositionCard snapshot={currentSnapshot} loading={positionLoading} />
              <SetupWizard
                snapshot={currentSnapshot}
                policy={currentPolicy}
                policyAddress={currentPolicyAddress}
                syncStatus={policySyncStatus}
                syncError={policySyncError}
                syncDisabled={
                  !anchorWallet ||
                  !currentSnapshot?.obligationAddress
                }
                onPolicyChange={handlePolicyChange}
                onSyncOnChain={handleActivateGuard}
                onDeposit={handleDepositBuffer}
                onWithdraw={handleWithdrawBuffer}
              />
              <ExecutionHistory records={executionHistory} />
            </>
          ) : (
            <>
              <AgentStatusCard
                snapshot={currentSnapshot}
                policy={currentPolicy}
                policyAddress={currentPolicyAddress!}
                agentStatus={agentStatus}
                currentDecision={currentDecision}
                currentExecution={currentExecution}
                interventionCount={executionHistory.filter(
                  (r) => r.status !== "rejected" && r.status !== "failed"
                ).length}
                onRunCheck={handleRunCheck}
                onDeposit={handleDepositBuffer}
                onPauseGuard={handlePauseGuard}
              />
              {/* Two-column: Position + Buffer */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PositionCard snapshot={currentSnapshot} loading={positionLoading} />
                <BufferCard
                  snapshot={currentSnapshot}
                  onDeposit={handleDepositBuffer}
                  onWithdraw={handleWithdrawBuffer}
                />
              </div>
              <AIDecisionCard
                title="Last AI Assessment"
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
              <ExecutionHistory records={executionHistory} />
              <PolicyForm
                policy={currentPolicy}
                onChange={handlePolicyChange}
                policyAddress={currentPolicyAddress}
                syncStatus={policySyncStatus}
                syncError={policySyncError}
                syncDisabled={
                  !anchorWallet ||
                  !currentSnapshot?.obligationAddress ||
                  (!currentPolicy.enabled && !currentPolicyAddress)
                }
                onSyncOnChain={handleSyncPolicyOnChain}
                onPauseGuard={handlePauseGuard}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
