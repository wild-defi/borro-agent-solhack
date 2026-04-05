# Borro Agent — Progress Tracker

**Hackathon:** National Solana Hackathon by Decentrathon
**Case:** 2 — AI + Blockchain: Autonomous Smart Contracts
**Deadline:** April 7, 2026, 23:59 (GMT+5)
**Submit:** Google Forms + [colosseum.com](https://colosseum.com)
**Repo:** [wild-defi/borro-agent-solhack](https://github.com/wild-defi/borro-agent-solhack)

---

## Environment

| Tool | Version | Status |
|------|---------|--------|
| Node.js | 20.20.0 | ✅ Installed |
| Rust | 1.94.1 | ✅ Installed |
| Solana CLI | 3.1.12 | ✅ Installed |
| Anchor | 0.32.1 | ✅ Installed |
| Yarn | 1.22.22 | ✅ Installed |

---

## Implementation Progress

### Phase 0: Scaffold
**Status: ✅ DONE** (2026-03-29)

- [x] `apps/web` — Next.js 16 + TypeScript + Tailwind
- [x] `programs/borro-guard` — Anchor 0.32.1 workspace
- [x] `workers/monitor` — TypeScript worker with tsx
- [x] `.env.example` files for web and worker
- [x] `.gitignore`
- [x] Verified: `next build` passes
- [x] Verified: `anchor build` passes
- [x] Verified: worker starts and runs monitor loop

---

### Phase 1: Wallet Connect + Dashboard Shell
**Status: ✅ DONE** (2026-03-29)

**Goal:** User can connect Phantom wallet and see a dashboard with mocked position data.

**Tasks:**
- [x] Install Solana wallet adapter packages in `apps/web`
- [x] Create `src/components/wallet/wallet-provider.tsx`
- [x] Create `src/components/wallet/connect-wallet-button.tsx`
- [x] Create `src/lib/solana/connection.ts`
- [x] Create `src/app/dashboard/page.tsx`
- [x] Create `src/components/dashboard/position-card.tsx` (mocked data)
- [x] Create `src/components/dashboard/policy-form.tsx` (UI only, with toggle + risk profiles)
- [x] Create `src/components/dashboard/buffer-card.tsx` (mocked data)
- [x] Landing page with link to dashboard
- [x] Verified: `next build` passes

**Definition of done:** User connects Phantom, sees dashboard with mocked position (HF, LTV, collateral, debt). ✅

---

### Phase 2: Shared Types
**Status: ✅ DONE** (2026-03-29)

**Goal:** Define common types used across frontend, worker, and program client.

**Tasks:**
- [x] Create `src/lib/types/policy.ts` — Policy, RiskProfile, AllowedAction
- [x] Create `src/lib/types/snapshot.ts` — PositionSnapshot
- [x] Create `src/lib/types/decision.ts` — AIDecision
- [x] Create `src/lib/types/execution.ts` — ExecutionRecord, ExecutionStatus
- [x] Create `src/lib/types/index.ts` — barrel export

---

### Phase 3: Kamino Read Integration
**Status: ✅ DONE** (2026-03-29)

**Goal:** Read a real Kamino position and display it in the UI.

**Tasks:**
- [x] Install Kamino SDK (`@kamino-finance/klend-sdk`) + `@solana/kit`
- [x] Create `src/lib/solana/kamino.ts` — KaminoMarket.load + fetchUserPosition
- [x] Create `src/lib/services/position-service.ts` — mock/real position with fallback
- [x] Create `src/app/api/position/route.ts` — GET ?wallet=...&mock=true
- [x] Update position-card to fetch via API
- [x] Create `workers/monitor/src/fetch-position.ts` (mock for now)
- [x] Configure `next.config.ts` — serverExternalPackages for Kamino/WASM
- [x] Verified: `next build` passes

**Note:** Position card currently uses `?mock=true` by default. To switch to real Kamino data, remove the `mock` param and set `NEXT_PUBLIC_SOLANA_RPC_URL` to a mainnet RPC.

**Definition of done:** Dashboard shows a Kamino position (collateral, debt, LTV, health factor). ✅

---

### Phase 4: Anchor Program — State & Instructions
**Status: ✅ DONE** (2026-03-31)

**Goal:** Deploy Borro Guard program with core instructions.

**Tasks:**
- [x] Create `state.rs` — PolicyAccount, DecisionLogAccount
- [x] Create `constants.rs`
- [x] Create `errors.rs`
- [x] Implement `initialize_policy`
- [x] Implement `update_policy`
- [x] Implement `record_decision`
- [x] Implement `pause_guard`
- [x] Implement `deposit_buffer`
- [x] Implement `withdraw_buffer`
- [x] Write basic tests
- [x] Deploy to devnet

**Devnet deployment:**
- Program ID: `7XZ4WDsPMAiJwVGpt52QVk69mQ5HqjcMcobwEyh4s9gv`
- IDL account: `E6PBzD8EsWMpyTj1yCK7EEqwn8ogi9ourZysgmgivsen`
- Deploy TX: `2B2sgZc56qcEDSW2gihWhVbyjSzDDvwt94ZFQu6hDtnpz8TX761cAEv5dPzrH3KeEvTwJuo1Lb62tFPCWJFwMoev`
- Upgrade authority: `3tdnyp3dCq1YaK1kUFTAddxFGquBR5LdpafgwxLtPXK9`

**Verified:**
- [x] `anchor build` passes
- [x] `anchor test --skip-build` passes (`4 passing`)
- [x] Program deployed and confirmed on devnet

**Definition of done:** Policy can be created, updated, paused. Decision log can be written. Program live on devnet. ✅

---

### Phase 5: AI Decision Engine
**Status: ✅ DONE** (2026-03-29)

**Goal:** AI receives position snapshot, returns structured decision JSON.

**Tasks:**
- [x] Create `src/lib/ai/schema.ts` — runtime AI output validation
- [x] Create `src/lib/ai/prompts.ts` — prompt template
- [x] Create `src/lib/ai/client.ts` — OpenAI client + fallback heuristic
- [x] Create `src/app/api/ai/route.ts`
- [x] Create `workers/monitor/src/build-snapshot.ts`
- [x] Create `workers/monitor/src/decide.ts`
- [x] Create `src/lib/risk/metrics.ts` — distanceToLiquidation, volatilityScore

**Verified:**
- [x] Worker type-check passes (`npx tsc --noEmit -p workers/monitor/tsconfig.json`)
- [x] Web build passes with Webpack (`next build --webpack`)

**Notes:**
- If `OPENAI_API_KEY` is missing, the system falls back to a deterministic heuristic decision.
- Turbopack hit a sandbox-specific process/port error, so verification was done with Webpack instead.

**Definition of done:** Given a position snapshot, AI returns structured JSON: `{ action, target_health_factor, repay_amount_usdc, confidence, reason }`. ✅

---

### Phase 6: Validation Layer
**Status: ✅ DONE** (2026-03-29)

**Goal:** Every AI decision is validated against policy before execution.

**Tasks:**
- [x] Create `src/lib/risk/validation.ts`
- [x] Create `src/lib/risk/actions.ts`
- [x] Create `workers/monitor/src/validate.ts`
- [x] Rules: action in allowed_actions, amount ≤ max, cooldown respected, buffer sufficient, confidence threshold

**Verified:**
- [x] Worker type-check passes (`npx tsc --noEmit -p workers/monitor/tsconfig.json`)
- [x] Web build passes with Webpack (`next build --webpack`)

**Definition of done:** Invalid AI decisions are rejected or reduced to safe range. No raw AI output reaches execution. ✅

---

### Phase 7: Execution — REPAY_FROM_BUFFER
**Status: 🟡 CORE DONE, LIVE REPAY PENDING** (2026-03-29)

**Goal:** First working execution path — repay debt using safety buffer USDC.

**Tasks:**
- [x] Create `src/lib/services/execution-service.ts`
- [x] Create `workers/monitor/src/execute.ts`
- [x] Build Kamino repay transaction flow (`kamino_repay` mode)
- [x] After success, call `record_decision` on Borro Guard
- [x] Create `src/app/api/execute/route.ts`

**Verified:**
- [x] Worker type-check passes (`./workers/monitor/node_modules/.bin/tsc --noEmit -p workers/monitor/tsconfig.json`)
- [x] Web build passes with Webpack (`next build --webpack`)

**Notes:**
- Execution supports three modes: `mock`, `record_only`, and `kamino_repay`.
- `mock` simulates repay and projected health factor improvement without sending a transaction.
- `record_only` writes the decision log on-chain through Borro Guard without calling Kamino.
- `kamino_repay` is implemented for the current MVP assumption that the monitored position and repay funds belong to the agent-controlled demo wallet. The Borro vault-to-Kamino withdraw path is not wired yet. Live end-to-end verification still needs a configured demo wallet, buffer funds, and RPC credentials.

**Definition of done:** Demo wallet repays part of the debt from buffer, health factor improves, decision logged on-chain. 🟡

---

### Phase 8: Dashboard — Decision History & States
**Status: ✅ DONE** (2026-04-01)

**Goal:** Dashboard shows the full decision-to-execution flow for the judges.

**Tasks:**
- [x] Create `src/components/dashboard/ai-decision-card.tsx`
- [x] Create `src/components/dashboard/execution-history.tsx`
- [x] Implement UI states: idle → monitoring → decision_ready → executing → executed
- [x] Show tx signature link to Solscan
- [x] Position Analysis block — 5 risk signals with color indicators (HF, distance to liq, volatility, oracle confidence, buffer)
- [x] Improved AI reason text — context-specific instead of generic
- [x] GPT-4o-mini integration — real AI decisions via OpenAI API

**Verified:**
- [x] Mock mode: full flow works (Run Check → Decision → Execute → History)
- [x] Record_only mode: decision logged on-chain, Solscan TX link shown
- [x] `next build --webpack` passes

**Definition of done:** Judges can watch the process from risk detection to on-chain action. ✅

---

### Phase 8.5: Demo Polish
**Status: 🟡 IN PROGRESS** (2026-03-31)

**Goal:** Maximize demo impact for judges.

**Tasks:**
- [x] GPT-4o-mini connected — real AI reasoning
- [x] Worker autonomous demo — monitor loop, configurable interval, structured logging
- [x] Stepper/timeline UI — visual flow: Detect → Analyze → Decide → Validate → Execute (progress dots + connecting lines)
- [x] "Verified on Solana" badge — emerald badge with Solscan links after on-chain execution
- [x] Counterfactual — "Without Borro: liquidation at X%. With Borro: safe until Y%" comparison card
- [x] Fixed critical demo snapshot — one stable mock position with HF slightly above 1.0 for consistent judge demos
- [x] Position consistency fix — AI check now analyzes the exact snapshot shown in the position card
- [x] Dynamic snapshot updates after execution — debt, buffer, LTV, and HF update after mock/recorded repay
- [x] Policy presets — Conservative / Balanced / Aggressive now update visible policy parameters instead of acting as hidden state only
- [x] State-based dashboard flow — separate setup mode from active monitoring mode
- [x] Setup checklist UI — position, policy, buffer, and on-chain enablement shown as explicit onboarding steps
- [x] Honest setup defaults — policy toggle starts OFF and buffer starts at $0 instead of appearing preconfigured
- [x] Policy configuration fix — clicking risk presets no longer marks the policy as configured until the toggle is enabled
- [x] Demo buffer controls — Deposit / Withdraw now change the mock buffer in setup mode for onboarding demos
- [x] Preview recommendation card removed from setup flow to keep onboarding simpler and less misleading
- [x] Devnet SOL preflight for `Enable AI Guard` — browser client now checks wallet balance before policy init/update and shows a clear fee/rent error

---

### Phase 9: Demo & Documentation
**Status: 🟡 IN PROGRESS**

**Goal:** Demo-ready product with documentation.

#### Priority 1 — Must Do
- [ ] **README.md** — architecture diagram, screenshots, "AI vs deterministic logic" section, setup instructions
- [x] **Expanded AI reasoning in UI** — show signal breakdown (HF, volatility, oracle, buffer) that AI weighed, not just one-line reason
- [ ] **Demo video (90s)** — full cycle: connect wallet → AI decision → on-chain tx → Solscan link
- [ ] Write `docs/demo-script.md` — step-by-step demo scenario
- [ ] Write `docs/known-risks.md` — what's mocked, what's real, what's next

#### Priority 2 — If Time Allows
- [x] **"Enable AI Guard" button** — on-chain policy creation/update from UI (user signs tx → PolicyAccount created or updated)
- [x] **"View AI Reasoning" toggle** — show full AI input/output pipeline on decision card
- [ ] **Real market signals for AI reasoning** — replace mocked `oracleConfidence` and `volatilityScore` with live data (~1h work):
  - **Pyth oracle** (`@pythnetwork/hermes-client` already installed) — real SOL/USD confidence interval → replaces hardcoded `oracleConfidence: 0.95` in `position-service.ts`
  - **CoinGecko SOL 24h change** — free, no API key, adds `solPriceChange24h` to snapshot → AI reasons "SOL down 8% in 24h, HF will keep falling"
  - **Fear & Greed Index** (`api.alternative.me/fng/`) — bonus signal, 10 min to add, gives AI market-wide context
  - Prompt update: include new fields in `buildDecisionUserPrompt()` so AI explicitly weighs them
  - Impact: AI reason goes from generic to specific and verifiable by judges

**Additional completed work:**
- [x] Dashboard fetches existing on-chain `PolicyAccount` by PDA for the current wallet + obligation
- [x] Policy form can initialize or update Borro Guard policy on devnet through Phantom
- [x] `policyAddress` is now passed into execution so on-chain decision logs can bind to the user policy
- [x] Public Borro config route added for browser-side policy sync (`/api/borro/config`)
- [x] Setup-mode UX cleanup — users now configure policy first, fund buffer second, then enable the guard on-chain
- [x] Active monitoring layout — once enabled on-chain, the dashboard switches into status / assessment / history mode
- [x] Policy sync messaging improved — local draft, synced, saving, and insufficient devnet SOL states are now surfaced in the UI
- [x] Autonomous monitoring mode on dashboard — users can choose `supervised` or `autonomous`, and Borro can auto-check plus auto-execute within policy limits while the session stays open
- [x] Execution reasoning is now attached to history entries — each repay action can show the snapshot, raw model output, validated decision, and guardrail result used for that intervention
- [x] Execution Check UX redesigned — guardrail outcomes now surface as user-facing states (`Passed`, `Adjusted`, `Blocked`) instead of low-level validation jargon
- [x] Empty-buffer blocked state upgraded — when repayment is blocked by an empty safety buffer, the dashboard now recommends topping up the buffer instead of presenting a misleading `No Action Needed` fallback
- [x] Executed assessment card simplified — removed the extra `What-if Comparison` panel and tightened the execution outcome presentation
- [x] Dashboard typography refined — improved badge sizing, card headings, stat labels, and monospaced numeric hierarchy for better readability in demos

**Current blocker / note:**
- `Enable AI Guard On-Chain` on devnet still requires the connected wallet to hold a small amount of devnet SOL for rent and transaction fees. The UI now pre-checks this and shows a friendly error before Phantom simulation, but the wallet still needs funding to complete policy creation.

#### Submission
- [ ] Submit to Google Forms
- [ ] Submit to Colosseum

**Definition of done:** Project submitted, demo shows full loop: risky position → AI intervention → on-chain repay → improved health factor.

---

## Critical Path (if time gets tight)

Must-have sequence:
1. ✅ Scaffold
2. ✅ Wallet connect
3. ✅ Kamino read
4. ✅ Anchor policy account (devnet deployed)
5. ✅ AI structured decision (GPT-4o-mini connected)
6. ✅ Validation layer
7. ✅ REPAY_FROM_BUFFER (mock + record_only on devnet)
8. ✅ Decision history dashboard + Position Analysis
9. ✅ Demo polish (stepper, counterfactual, worker demo, verified badge, fixed critical demo snapshot, state-based setup flow)
10. 🔲 Demo & documentation

**Can be cut:**
- Collateral swap (REPAY_WITH_COLLATERAL)
- Advanced sentiment/news signals
- Polished animations
- Multi-user support

---

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Connect wallet → view Kamino position → create policy → get AI decision JSON | ✅ |
| M2 | Execute REPAY_FROM_BUFFER → show improved health factor (= MVP) | ✅ |
| M3 | Full demo with UI states, history, and documentation | 🟡 |
