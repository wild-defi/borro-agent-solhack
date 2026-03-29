import type { Metadata } from "next";
import AppWalletProvider from "@/components/wallet/wallet-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Borro Agent — AI Risk Guard for Solana Lending",
  description:
    "Autonomous AI guard that prevents liquidation of lending positions on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <AppWalletProvider>{children}</AppWalletProvider>
      </body>
    </html>
  );
}
