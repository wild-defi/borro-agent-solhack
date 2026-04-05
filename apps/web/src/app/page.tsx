import LandingDashboardCta from "@/components/wallet/landing-dashboard-cta";

export default function Home() {
  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 borro-landing-glow" />
      <div className="absolute inset-0 borro-noise-soft" />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-7xl items-center px-6 py-10 sm:px-10 lg:px-16">
        <section className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,42rem)_1fr]">
          <div className="animate-borro-rise max-w-none">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              Autonomous Yield + Risk Management
            </p>

            <h1 className="mt-5 whitespace-nowrap font-[family-name:var(--font-mono)] text-[clamp(3.5rem,9vw,6.6rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-zinc-50">
              Borro Agent
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              An AI agent for Solana lending positions that can defend health
              factor, automate repayment, and evolve into carry trade
              strategies with on-chain guardrails.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <LandingDashboardCta />

              <p className="max-w-xs font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Monitor liquidation risk now. Expand into carry trade automation
                next.
              </p>
            </div>
          </div>

          <div className="relative h-[26rem] min-h-[420px]">
            <div className="absolute inset-x-0 top-10 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
            <div className="absolute right-[9%] top-[16%] h-[20rem] w-[20rem] rounded-full border border-emerald-400/15 borro-orbit-ring" />
            <div className="absolute right-[17%] top-[24%] h-[14rem] w-[14rem] rounded-full border border-indigo-400/20" />

            <div className="absolute right-[11%] top-[26%] h-[3px] w-[54%] overflow-hidden rounded-full bg-zinc-800/90">
              <div className="borro-signal-scan h-full w-[48%] rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" />
            </div>

            <div className="absolute bottom-[26%] right-[8%] w-[62%]">
              <svg
                viewBox="0 0 520 220"
                className="h-auto w-full overflow-visible"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M0 186C58 186 83 161 119 161C158 161 166 188 212 188C257 188 261 63 318 63C360 63 373 144 430 144C469 144 482 118 520 118"
                  stroke="url(#signalStroke)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="borro-path-draw"
                />
                <path
                  d="M0 148H520"
                  stroke="rgba(244,63,94,0.28)"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                />
                <defs>
                  <linearGradient id="signalStroke" x1="0" y1="0" x2="520" y2="0">
                    <stop stopColor="#f43f5e" />
                    <stop offset="0.52" stopColor="#f59e0b" />
                    <stop offset="1" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="absolute left-[6%] top-[12%]">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-zinc-600">
                Health Factor
              </p>
              <p className="mt-2 font-[family-name:var(--font-mono)] text-5xl font-semibold tracking-[-0.06em] text-zinc-50 sm:text-6xl">
                1.03
              </p>
              <p className="mt-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.16em] text-red-400">
                intervention pending
              </p>
            </div>

            <div className="absolute bottom-[16%] left-[6%] space-y-5">
              <Metric label="Mode" value="Auto-repay" tone="text-emerald-400" />
              <Metric label="Next Layer" value="Carry Trade" tone="text-indigo-300" />
              <Metric label="Policy" value="On-chain Guardrails" tone="text-zinc-200" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-mono)] text-sm font-medium uppercase tracking-[0.14em] ${
          tone ?? "text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
