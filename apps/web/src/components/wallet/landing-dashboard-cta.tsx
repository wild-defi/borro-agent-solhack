"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function LandingDashboardCta() {
  const router = useRouter();
  const { connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [pendingRedirect, setPendingRedirect] = useState(false);

  useEffect(() => {
    if (!pendingRedirect || !connected) {
      return;
    }

    setPendingRedirect(false);
    router.push("/dashboard");
  }, [connected, pendingRedirect, router]);

  const handleOpenDashboard = () => {
    if (connected) {
      router.push("/dashboard");
      return;
    }

    setPendingRedirect(true);
    setVisible(true);
  };

  return (
    <button
      type="button"
      onClick={handleOpenDashboard}
      className="inline-flex h-12 items-center rounded-full bg-indigo-600 px-6 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]"
    >
      {connecting && pendingRedirect ? "Connecting..." : "Open Dashboard"}
    </button>
  );
}
