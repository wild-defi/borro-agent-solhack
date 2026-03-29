"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import ConnectWalletButton from "@/components/wallet/connect-wallet-button";
import PositionCard from "@/components/dashboard/position-card";
import PolicyForm from "@/components/dashboard/policy-form";
import BufferCard from "@/components/dashboard/buffer-card";

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();

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
          <PolicyForm />
          <BufferCard />
        </div>
      )}
    </div>
  );
}
