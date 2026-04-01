"use client";

import { useCallback, useState } from "react";
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
  PositionSnapshot,
} from "@/lib/types";

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [currentSnapshot, setCurrentSnapshot] =
    useState<PositionSnapshot | null>(null);
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

  const handleRunCheck = useCallback(async () => {
    if (!publicKey) return;
    setAgentStatus("monitoring");
    setError(null);
    setCurrentExecution(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58(), mock: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to get AI decision");
        setAgentStatus("idle");
        return;
      }

      setCurrentSnapshot(data.snapshot);
      setCurrentDecision(data.validatedDecision);
      setCurrentValidation(data.validation);
      setAgentStatus("decision_ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setAgentStatus("idle");
    }
  }, [publicKey]);

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
      setExecutionHistory((prev) => [execution, ...prev]);
      setAgentStatus("executed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setAgentStatus("decision_ready");
    }
  }, [publicKey, currentSnapshot, currentDecision]);

  const handleReset = useCallback(() => {
    setAgentStatus("idle");
    setCurrentSnapshot(null);
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
          <PositionCard />
          <AIDecisionCard
            status={agentStatus}
            snapshot={currentSnapshot}
            decision={currentDecision}
            validation={currentValidation}
            execution={currentExecution}
            error={error}
            onRunCheck={handleRunCheck}
            onExecute={handleExecute}
            onReset={handleReset}
          />
          <PolicyForm />
          <BufferCard />
          <ExecutionHistory records={executionHistory} />
        </div>
      )}
    </div>
  );
}
