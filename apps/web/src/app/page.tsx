import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Borro Agent</h1>
        <p className="mt-3 text-lg text-zinc-400">
          AI-powered liquidation prevention for Solana lending
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Open Dashboard
      </Link>
    </div>
  );
}
