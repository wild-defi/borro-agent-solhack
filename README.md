# Borro Agent

**Borro Agent** is an autonomous AI risk manager for lending positions on Solana. It monitors a user's Kamino borrowing position, evaluates liquidation risk, proposes or executes protective actions, and records intervention state through a custom Solana program.

The current hackathon MVP focuses on **liquidation prevention**. The broader product direction is a capital-management agent that can later expand into **carry trade automation** using the same policy, monitoring, and guardrail framework.

## One-Line Pitch

**Borro Agent is an autonomous AI guard for Solana lending positions that prevents liquidation by selecting and executing on-chain protective actions based on market conditions and user-defined policy.**

## Problem

Lending users deposit volatile collateral such as `SOL` and borrow stablecoins such as `USDC`.

When the market moves quickly:
- collateral value drops
- `LTV` rises
- health factor deteriorates
- the user may be offline and unable to react before liquidation

Existing liquidation bots protect the protocol, not the borrower. They act after the position becomes unsafe.

## Solution

Borro Agent acts as a **user-side liquidation prevention layer**:
- reads a Kamino position
- evaluates risk with AI plus deterministic guardrails
- enforces a user-defined protection policy
- repays from a safety buffer when allowed
- logs decisions on-chain through **Borro Guard**

## Current MVP Status

### Working today

- Solana wallet connect from the landing page
- Kamino position dashboard
- setup flow for policy, buffer, and guard activation
- on-chain `PolicyAccount` create/update from UI
- autonomous or supervised monitoring mode
- AI decision engine with structured output
- deterministic validation layer
- `REPAY_FROM_BUFFER` flow in `mock`, `record_only`, or `kamino_repay` modes
- on-chain decision logging through Borro Guard
- AI reasoning UI with live market signals
- execution history with reasoning per intervention

## Core User Flow

1. User lands on the site and clicks `Open Dashboard`.
2. Wallet modal opens directly from the landing page.
3. User connects Phantom and enters the dashboard.
4. Borro reads the position and shows the current health state.
5. User configures policy, funds the safety buffer, and enables AI Guard on-chain.
6. Borro monitors in either `supervised` or `autonomous` mode.
7. AI proposes an action.
8. Deterministic guardrails validate, adjust, or block it.
9. The dashboard shows reasoning, execution status, and on-chain evidence.

## AI Decision Model

The AI can only return a structured decision inside a bounded action set:

- `DO_NOTHING`
- `REPAY_FROM_BUFFER`
- `REPAY_WITH_COLLATERAL`
- `PARTIAL_DELEVERAGE`

Example output:

```json
{
  "action": "REPAY_FROM_BUFFER",
  "targetHealthFactor": 1.25,
  "repayAmountUsd": 300,
  "confidence": 0.85,
  "reason": "Health factor is below target, SOL is down sharply, and the confidence band is widening."
}
```

## AI vs Deterministic Logic

**AI proposes. The system enforces.**

### AI reasons over:
- health factor
- distance to liquidation
- available buffer
- volatility score
- `SOL` 24h price change
- `Pyth` confidence band
- `Fear & Greed` market regime

### Deterministic guardrails enforce:
- allowed actions only
- max repay per intervention
- max daily intervention cap
- cooldown windows
- buffer availability
- policy enabled / paused state

This separation is the core safety model of the product.

## Live Market Signals In Reasoning

The dashboard now includes live market context in both the visible analysis block and the full reasoning panel:

- **SOL 24h Change** via CoinGecko
- **Pyth Confidence Band** via Pyth Hermes
- **Fear & Greed Index** via Alternative.me

This makes Borro's reasoning auditable and concrete. Instead of a generic explanation, the agent can explain decisions in terms of:
- weakening collateral trend
- higher oracle uncertainty
- risk-off market regime

## Safety Model

Borro Agent validates every AI decision before execution:
- only policy-approved actions can run
- repay amount is capped
- daily intervention limits are enforced
- cooldown rules prevent over-trading
- emergency pause is available

## On-Chain Component

The custom Solana program is **Borro Guard**.

It stores:
- user protection policy
- allowed actions
- pause state
- safety buffer metadata
- decision logs

### Devnet deployment

- Program ID: `7XZ4WDsPMAiJwVGpt52QVk69mQ5HqjcMcobwEyh4s9gv`
- IDL account: `E6PBzD8EsWMpyTj1yCK7EEqwn8ogi9ourZysgmgivsen`

## Architecture

```text
[ User / Wallet ]
        |
        v
[ Next.js App ]
        |
        +------------------------------+
        |                              |
        v                              v
[ Borro Guard Program ]         [ Monitoring / AI Layer ]
        |                              |
        | stores policy and logs       | reads Kamino, Pyth, CoinGecko,
        |                              | Fear & Greed, and market state
        |                              |
        |                              v
        |                       [ OpenAI Decision Engine ]
        |                              |
        +<--------- validation --------+
        |
        v
[ Transaction Executor ]
        |
        v
[ Solana ]
        |
        +--> Kamino
        +--> Pyth
        +--> Borro Guard
```

## Execution Modes

Execution can run in three modes:

- `mock`
  - simulates repayment and projected HF improvement
- `record_only`
  - writes the decision log on-chain through Borro Guard
- `kamino_repay`
  - attempts the real repay flow for the configured demo wallet path

This lets us demo the same product loop at different levels of realism.

## MVP Scope

To keep the hackathon build focused:
- protocol: `Kamino`
- primary collateral demo: `SOL`
- primary debt demo: `USDC`
- working execution path: `REPAY_FROM_BUFFER`
- user policy and logging: `Borro Guard`

## Demo Flow

The intended demo loop is:

1. Connect wallet from landing page
2. Open dashboard
3. Configure guard policy
4. Fund buffer
5. Enable AI Guard on-chain
6. Trigger or wait for assessment
7. Show AI reasoning
8. Show validated action
9. Show on-chain log or repay result
10. Show improved health factor

## Local Setup

### Prerequisites

- Node.js `20`
- Rust
- Solana CLI
- Anchor

### Web app env

Copy [apps/web/.env.example](./apps/web/.env.example) to `apps/web/.env.local` and set:

- `NEXT_PUBLIC_CLUSTER`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `SOLANA_RPC_URL`
- `NEXT_PUBLIC_BORRO_PROGRAM_ID`
- `BORRO_PROGRAM_ID`
- `OPENAI_API_KEY`
- `EXECUTION_MODE`

### Worker env

Copy [workers/monitor/.env.example](./workers/monitor/.env.example) to `workers/monitor/.env` and set:

- `SOLANA_RPC_URL`
- `BORRO_PROGRAM_ID`
- `BORRO_API_URL`
- `OPENAI_API_KEY`
- `EXECUTION_MODE`
- `MONITOR_WALLET`

## Run Locally

### Web

```bash
cd apps/web
npm install
npm run dev
```

### Worker

```bash
cd workers/monitor
npm install
npm run dev
```

### Anchor program

```bash
cd programs/borro-guard
yarn install
anchor build
anchor test --skip-build
```

## Verification

The project has been repeatedly verified with:

```bash
cd apps/web
/opt/homebrew/opt/node@20/bin/node ./node_modules/next/dist/bin/next build --webpack
```

and for Anchor:

```bash
cd programs/borro-guard
anchor build
anchor test --skip-build
```

## Why It Fits The Hackathon

Borro Agent matches the `AI + Blockchain: Autonomous Smart Contracts` case because:
- AI is part of decision-making
- AI decisions lead to on-chain state changes or on-chain logs
- the system can operate in supervised or autonomous mode
- the project includes a deployed Solana program
- the demo can show:

`AI -> reasoning -> validation -> transaction/log -> smart contract state change`

## Tech Stack

- `Solana`
- `Kamino`
- `Pyth`
- `CoinGecko`
- `Alternative.me Fear & Greed`
- `Anchor`
- `Next.js`
- `TypeScript`
- `OpenAI API`

## Repository Documents

- [Architecture & PRD](./Borro_Agent_Architecture.md)
- [MVP Backlog](./MVP_Backlog.md)
- [Signing and Custody Models](./Signing_Custody_Models.md)
- [Hackathon Brief](./National_Solana_Hackathon_Brief.md)
- [Progress Tracker](./PROGRESS.md)

