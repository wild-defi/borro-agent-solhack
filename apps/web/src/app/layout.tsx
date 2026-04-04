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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="borro-grid-bg min-h-full flex flex-col text-zinc-100">
        <AppWalletProvider>{children}</AppWalletProvider>
      </body>
    </html>
  );
}
