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
**Status: 🟡 CORE DONE, DEVNET PENDING** (2026-03-29)

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
- [ ] Deploy to devnet

**Verified:**
- [x] `anchor build` passes
- [x] `anchor test --skip-build` passes (`4 passing`)

**Definition of done:** Policy can be created, updated, paused. Decision log can be written. All via tests. ✅

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
**Status: 🔲 TODO**

**Goal:** Dashboard shows the full decision-to-execution flow for the judges.

**Tasks:**
- [ ] Create `src/components/dashboard/ai-decision-card.tsx`
- [ ] Create `src/components/dashboard/execution-history.tsx`
- [ ] Implement UI states: idle → monitoring → decision_ready → validating → executing → executed
- [ ] Show tx signature link to Solscan

**Definition of done:** Judges can watch the process from risk detection to on-chain action.

---

### Phase 9: Demo & Documentation
**Status: 🔲 TODO**

**Goal:** Demo-ready product with documentation.

**Tasks:**
- [ ] Write `docs/demo-script.md` — step-by-step demo scenario
- [ ] Write `docs/known-risks.md` — what's mocked, what's real, what's next
- [ ] Update `README.md` with setup instructions
- [ ] Prepare demo wallet with risky Kamino position on devnet
- [ ] Record demo video (optional)
- [ ] Submit to Google Forms
- [ ] Submit to Colosseum

**Definition of done:** Project submitted, demo shows full loop: risky position → AI intervention → on-chain repay → improved health factor.

---

## Critical Path (if time gets tight)

Must-have sequence:
1. ✅ Scaffold
2. ⏳ Wallet connect
3. Kamino read
4. Anchor policy account
5. AI structured decision
6. Validation layer
7. REPAY_FROM_BUFFER
8. Decision log
9. Demo dashboard

**Can be cut:**
- Collateral swap (REPAY_WITH_COLLATERAL)
- Advanced sentiment/news signals
- Polished animations
- Multi-user support

---

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Connect wallet → view Kamino position → create policy → get AI decision JSON | 🔲 |
| M2 | Execute REPAY_FROM_BUFFER → show improved health factor (= MVP) | 🔲 |
| M3 | Full demo with UI states, history, and documentation | 🔲 |
