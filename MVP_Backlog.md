# Borro Agent MVP Backlog

This document breaks the MVP into concrete folders, files, and implementation tasks so development can start immediately.

---

## 1. MVP Scope

The first working version includes only:
- `Kamino`
- `SOL` as collateral
- `USDC` as debt
- one real protective action: `REPAY_FROM_BUFFER`
- an `Anchor program` for policy and logging
- a `Next.js` app for UI and backend routes
- a `worker` for monitoring and the AI decision loop

Out of scope for the first milestone:
- `REPAY_WITH_COLLATERAL`
- multi-asset support
- production-grade auth
- Telegram alerts
- news or sentiment

---

## 2. Target Project Structure

```text
Solhack/
├── README.md
├── Borro_Agent_Architecture.md
├── MVP_Backlog.md
├── Signing_Custody_Models.md
├── National_Solana_Hackathon_Brief.md
├── apps/
│   └── web/
│       ├── package.json
│       ├── next.config.js
│       ├── tsconfig.json
│       ├── .env.example
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   └── api/
│       │   │       ├── policy/route.ts
│       │   │       ├── position/route.ts
│       │   │       ├── ai/route.ts
│       │   │       └── execute/route.ts
│       │   ├── components/
│       │   │   ├── wallet/
│       │   │   │   ├── wallet-provider.tsx
│       │   │   │   └── connect-wallet-button.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── position-card.tsx
│       │   │   │   ├── policy-form.tsx
│       │   │   │   ├── ai-decision-card.tsx
│       │   │   │   ├── buffer-card.tsx
│       │   │   │   └── execution-history.tsx
│       │   │   └── ui/
│       │   ├── lib/
│       │   │   ├── env.ts
│       │   │   ├── solana/
│       │   │   │   ├── connection.ts
│       │   │   │   ├── wallet.ts
│       │   │   │   ├── borro-program.ts
│       │   │   │   └── kamino.ts
│       │   │   ├── ai/
│       │   │   │   ├── schema.ts
│       │   │   │   ├── prompts.ts
│       │   │   │   └── client.ts
│       │   │   ├── risk/
│       │   │   │   ├── snapshot.ts
│       │   │   │   ├── validation.ts
│       │   │   │   ├── metrics.ts
│       │   │   │   └── actions.ts
│       │   │   ├── services/
│       │   │   │   ├── policy-service.ts
│       │   │   │   ├── position-service.ts
│       │   │   │   ├── decision-service.ts
│       │   │   │   ├── execution-service.ts
│       │   │   │   └── log-service.ts
│       │   │   └── types/
│       │   │       ├── policy.ts
│       │   │       ├── snapshot.ts
│       │   │       ├── decision.ts
│       │   │       └── execution.ts
│       │   └── styles/
│       └── public/
├── programs/
│   └── borro-guard/
│       ├── Anchor.toml
│       ├── Cargo.toml
│       ├── programs/
│       │   └── borro-guard/
│       │       └── src/
│       │           ├── lib.rs
│       │           ├── state.rs
│       │           ├── errors.rs
│       │           ├── constants.rs
│       │           └── instructions/
│       │               ├── mod.rs
│       │               ├── initialize_policy.rs
│       │               ├── update_policy.rs
│       │               ├── deposit_buffer.rs
│       │               ├── withdraw_buffer.rs
│       │               ├── record_decision.rs
│       │               └── pause_guard.rs
│       └── tests/
│           ├── borro-guard.ts
│           └── fixtures.ts
├── workers/
│   └── monitor/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── config.ts
│           ├── monitor-loop.ts
│           ├── fetch-position.ts
│           ├── build-snapshot.ts
│           ├── decide.ts
│           ├── validate.ts
│           ├── execute.ts
│           └── persist.ts
└── docs/
    ├── demo-script.md
    ├── env.md
    └── known-risks.md
```

---

## 3. Implementation Order

### Phase 0. Scaffold

Goal: create the base monorepo structure and boot an empty frontend, Anchor workspace, and worker.

**Tasks**
- create `apps/web`
- create `programs/borro-guard`
- create `workers/monitor`
- add `.env.example`
- choose a package manager

**Files**
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/.env.example`
- `programs/borro-guard/Anchor.toml`
- `workers/monitor/package.json`

**Definition of done**
- `apps/web` starts
- `anchor build` passes
- `workers/monitor` starts as an empty process

---

## 4. Frontend Backlog

### 4.1 App Shell and Wallet

**Files**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/wallet/wallet-provider.tsx`
- `apps/web/src/components/wallet/connect-wallet-button.tsx`
- `apps/web/src/lib/solana/connection.ts`

**Tasks**
- integrate Solana wallet adapter
- build the app shell
- add a connect wallet button
- prepare the provider tree

**Definition of done**
- the user can connect `Phantom`
- the UI knows the `publicKey`

### 4.2 Dashboard

**Files**
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/components/dashboard/position-card.tsx`
- `apps/web/src/components/dashboard/policy-form.tsx`
- `apps/web/src/components/dashboard/buffer-card.tsx`
- `apps/web/src/components/dashboard/ai-decision-card.tsx`
- `apps/web/src/components/dashboard/execution-history.tsx`

**Tasks**
- render the current position
- render the policy form
- show the safety buffer
- show the latest AI decision
- show execution history

**Definition of done**
- the dashboard displays real or mocked position data
- there is a working `AI Guard` enablement form

### 4.3 API Routes

**Files**
- `apps/web/src/app/api/policy/route.ts`
- `apps/web/src/app/api/position/route.ts`
- `apps/web/src/app/api/ai/route.ts`
- `apps/web/src/app/api/execute/route.ts`

**Tasks**
- route for reading the position
- route for reading and updating policy
- route for requesting an AI decision
- route for manually triggering execution in the demo

**Definition of done**
- the UI can fetch all key data without calling SDK logic directly from components

---

## 5. Shared Types and Domain Layer

This should be done early so the project does not drift into ad hoc types.

**Files**
- `apps/web/src/lib/types/policy.ts`
- `apps/web/src/lib/types/snapshot.ts`
- `apps/web/src/lib/types/decision.ts`
- `apps/web/src/lib/types/execution.ts`

**Required entities**

**`Policy`**
- `owner`
- `obligationId`
- `riskProfile`
- `targetHealthFactor`
- `allowedActions`
- `maxRepayPerActionUsd`
- `maxDailyInterventionUsd`
- `cooldownSeconds`
- `enabled`

**`PositionSnapshot`**
- `collateralAsset`
- `debtAsset`
- `collateralValueUsd`
- `debtValueUsd`
- `ltv`
- `healthFactor`
- `distanceToLiquidation`
- `availableBufferUsd`
- `oracleConfidence`
- `volatilityScore`

**`AIDecision`**
- `action`
- `targetHealthFactor`
- `repayAmountUsd`
- `confidence`
- `reason`

**`ExecutionRecord`**
- `decisionId`
- `action`
- `requestedAmountUsd`
- `executedAmountUsd`
- `status`
- `txSignature`
- `timestamp`

**Definition of done**
- frontend, API, worker, and program all use the same vocabulary

---

## 6. Solana Integration Backlog

### 6.1 Kamino Read Integration

**Files**
- `apps/web/src/lib/solana/kamino.ts`
- `apps/web/src/lib/services/position-service.ts`
- `workers/monitor/src/fetch-position.ts`

**Tasks**
- connect to the Kamino SDK
- read the obligation or position
- normalize data into `PositionSnapshot`

**Definition of done**
- a readable snapshot can be loaded from a `wallet public key` or `obligation id`

### 6.2 Borro Guard Client

**Files**
- `apps/web/src/lib/solana/borro-program.ts`
- `apps/web/src/lib/services/policy-service.ts`
- `apps/web/src/lib/services/log-service.ts`

**Tasks**
- build a client for the Anchor program
- add PDA derivation helpers
- serialize and deserialize policies and logs

**Definition of done**
- the frontend and worker can both read from and write to the Borro Guard program

---

## 7. Anchor Program Backlog

### 7.1 State Accounts

**Files**
- `programs/borro-guard/programs/borro-guard/src/state.rs`
- `programs/borro-guard/programs/borro-guard/src/constants.rs`

**State to define**
- `PolicyAccount`
- `DecisionLogAccount`
- `BufferVaultAuthority` or related PDA seeds

### 7.2 Instructions

**Files**
- `initialize_policy.rs`
- `update_policy.rs`
- `deposit_buffer.rs`
- `withdraw_buffer.rs`
- `record_decision.rs`
- `pause_guard.rs`

**Minimum build order**
1. `initialize_policy`
2. `update_policy`
3. `record_decision`
4. `pause_guard`
5. `deposit_buffer`
6. `withdraw_buffer`

### 7.3 Core Program Wiring

**Files**
- `programs/borro-guard/programs/borro-guard/src/lib.rs`
- `programs/borro-guard/programs/borro-guard/src/errors.rs`
- `programs/borro-guard/programs/borro-guard/src/instructions/mod.rs`

**Definition of done**
- a policy can be created
- a policy can be updated
- a decision log can be written
- the guard can be paused

### 7.4 Tests

**Files**
- `programs/borro-guard/tests/borro-guard.ts`
- `programs/borro-guard/tests/fixtures.ts`

**Coverage**
- initialize success
- update success
- pause success
- record decision success
- unauthorized update failure

---

## 8. AI and Risk Engine Backlog

### 8.1 AI Schema

**Files**
- `apps/web/src/lib/ai/schema.ts`
- `apps/web/src/lib/ai/prompts.ts`
- `apps/web/src/lib/ai/client.ts`

**Tasks**
- define a JSON schema for model output
- write the prompt template
- add an OpenAI client

### 8.2 Risk Metrics

**Files**
- `apps/web/src/lib/risk/metrics.ts`
- `apps/web/src/lib/risk/snapshot.ts`
- `workers/monitor/src/build-snapshot.ts`

**Tasks**
- compute `distanceToLiquidation`
- compute `volatilityScore`
- build a unified snapshot

### 8.3 Validation Layer

**Files**
- `apps/web/src/lib/risk/validation.ts`
- `apps/web/src/lib/risk/actions.ts`
- `workers/monitor/src/validate.ts`

**Rules**
- the action must be allowed by policy
- the amount must not exceed `maxRepayPerActionUsd`
- cooldown must be respected
- if the buffer is smaller than the amount, the action is invalid
- if confidence is too low, fall back to `DO_NOTHING`

**Definition of done**
- every AI decision passes through a deterministic filter

---

## 9. Worker Backlog

The worker exists so the monitoring loop is not tied to page refreshes.

**Files**
- `workers/monitor/src/index.ts`
- `workers/monitor/src/config.ts`
- `workers/monitor/src/monitor-loop.ts`
- `workers/monitor/src/decide.ts`
- `workers/monitor/src/execute.ts`
- `workers/monitor/src/persist.ts`

**Loop**
1. get all active policies
2. read the position
3. build the snapshot
4. call the AI
5. validate the decision
6. if action = `REPAY_FROM_BUFFER`, execute it
7. persist the result

**Definition of done**
- the worker can complete the full cycle for one demo policy

---

## 10. Execution Backlog

### 10.1 First Execution Path

The first working execution path should be only:
- `REPAY_FROM_BUFFER`

**Files**
- `apps/web/src/lib/services/execution-service.ts`
- `workers/monitor/src/execute.ts`

**Logic**
- verify policy
- verify buffer balance
- build the `Kamino.repay()` transaction
- after success, call `record_decision`

**Definition of done**
- a demo wallet can really repay part of the debt

### 10.2 Stretch Goal

After the working MVP:
- `REPAY_WITH_COLLATERAL`

**New files**
- `apps/web/src/lib/services/jupiter-service.ts`
- `workers/monitor/src/execute-repay-with-collateral.ts`

This is not critical for milestone one.

---

## 11. UI State Backlog

This matters for the demo because the judges need to see the process, not just the final result.

**States**
- `idle`
- `monitoring`
- `decision_ready`
- `validating`
- `executing`
- `executed`
- `failed`
- `paused`

**Files**
- `apps/web/src/components/dashboard/ai-decision-card.tsx`
- `apps/web/src/components/dashboard/execution-history.tsx`

**Definition of done**
- the dashboard shows the path from decision to execution, not only the outcome

---

## 12. Environment and Secrets Backlog

**Files**
- `apps/web/.env.example`
- `workers/monitor/.env.example`
- `docs/env.md`

**Variables**
- `SOLANA_RPC_URL`
- `OPENAI_API_KEY`
- `KAMINO_ENV`
- `BORRO_PROGRAM_ID`
- `AGENT_SECRET_KEY`
- `NEXT_PUBLIC_CLUSTER`

If you later adopt `Turnkey` or `Privy`, add their environment variables in a second phase.

---

## 13. Demo Preparation Backlog

**Files**
- `docs/demo-script.md`
- `docs/known-risks.md`

**The demo script should show**
1. starting position
2. policy enabled
3. buffer funded
4. worker receives a risky snapshot
5. AI returns a decision
6. validation passes
7. repay is executed
8. `health factor` improves

**Known risks should include**
- what is mocked
- what is not part of the MVP
- what comes next after the hackathon

---

## 14. Practical Commit Order

To keep momentum and reduce confusion, I would batch the work like this.

### Commit 1
- scaffold `apps/web`
- scaffold `programs/borro-guard`
- scaffold `workers/monitor`

### Commit 2
- wallet connect
- dashboard shell
- position card with mocked data

### Commit 3
- Kamino read integration
- real position snapshot in the UI

### Commit 4
- Anchor state + initialize/update/pause

### Commit 5
- AI schema + prompt + decision service

### Commit 6
- validation layer

### Commit 7
- `REPAY_FROM_BUFFER` execution path

### Commit 8
- decision logs + execution history UI

### Commit 9
- demo docs + polish

---

## 15. Critical Path

If time gets tight, do not spread out. The must-have sequence is:

1. wallet connect
2. Kamino read
3. Anchor policy account
4. AI structured decision
5. validation layer
6. `REPAY_FROM_BUFFER`
7. decision log
8. demo dashboard

If something has to be cut, cut:
- collateral swap
- advanced sentiment
- polished animations
- multi-user support

---

## 16. First Coding Milestone

The first milestone to reach as quickly as possible is:

**"I can connect a wallet, view a Kamino position, create a policy account, and get an AI decision JSON from a real snapshot."**

Until this works, it is too early to move into execution.

The second milestone is:

**"I can execute `REPAY_FROM_BUFFER` for real and show an improved `health factor`."**

That is the MVP.
