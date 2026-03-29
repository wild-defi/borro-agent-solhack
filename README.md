# Borro Agent

**Borro Agent** is an autonomous AI risk manager for lending positions on Solana. It monitors a user's Kamino borrowing position, evaluates liquidation risk, executes on-chain protective actions before the position reaches a critical state, and can later support carry trade strategies built on top of the same lending infrastructure.

Instead of waiting for liquidation, Borro Agent acts earlier. It analyzes market volatility, oracle confidence, position health, and user-defined risk policy to choose the safest recovery strategy and submit a real blockchain transaction.

## Problem

Lending users deposit volatile collateral such as `SOL`, `BTC`, or `ETH` and borrow `USDC`.

When the market moves quickly:
- collateral value drops
- `LTV` rises
- the position approaches liquidation
- the user may be offline and unable to react in time

Existing liquidation bots protect protocols, not users. They step in only after a position becomes unsafe, and the borrower still loses part of the collateral.

## Solution

Borro Agent is built as a **liquidation prevention layer** for the user:
- continuously monitors the health of a Kamino position
- evaluates market conditions with an AI decision engine
- validates the proposed action against user policy and hard safety rules
- executes a real on-chain protection transaction
- logs decisions transparently through a custom Solana program

In the expanded product vision, the same agent framework can also support **carry trade strategies**, where the agent opens and manages capital-efficient lending and borrowing positions according to user-defined risk and yield preferences.

## Why This Is Not Just a Script

A simple risk bot uses one hardcoded rule:

`if health_factor < threshold -> repay`

Borro Agent does more:
- chooses between multiple allowed strategies
- adapts to the user's risk profile
- considers volatility, oracle confidence, buffer availability, and position state
- can use a safety buffer before selling collateral
- records decisions and execution metadata on-chain

This makes Borro Agent an **Autonomous Lending Risk Manager**, not just a liquidation script.

## Core User Flow

1. The user connects a wallet and views their Kamino position.
2. The user enables AI Guard and creates a protection policy.
3. The user optionally deposits `USDC` into a safety buffer vault.
4. Borro Agent monitors the position every few minutes.
5. The AI chooses one action from an allowed set.
6. The system validates the decision against hard guardrails.
7. A real on-chain transaction is executed.
8. The UI shows the updated health factor, action reason, and transaction signature.

## AI Decision Model

The AI does not have unlimited control. It can only return a structured decision inside a predefined action set:

- `DO_NOTHING`
- `REPAY_FROM_BUFFER`
- `REPAY_WITH_COLLATERAL`
- `PARTIAL_DELEVERAGE`

Example output:

```json
{
  "action": "REPAY_WITH_COLLATERAL",
  "target_health_factor": 1.35,
  "repay_amount_usdc": 420,
  "collateral_to_sell": "SOL",
  "confidence": 0.84,
  "reason": "SOL volatility is rising, oracle confidence is weaker, and buffer is insufficient for safe recovery."
}
```

## Safety Model

AI proposes. The system enforces.

Borro Agent validates every action before execution:
- only actions allowed by the user's policy can run
- repay amount is capped
- daily intervention limits are enforced
- cooldown rules prevent over-trading
- emergency pause is available

## On-Chain Component

To make the system verifiable and aligned with the hackathon requirements, Borro Agent includes a custom Solana program called **Borro Guard**.

It stores:
- user risk policy
- allowed actions
- safety buffer settings
- decision logs
- intervention history

This makes the product more than an off-chain bot integrated with an existing lending protocol.

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
[ Borro Guard Program ]         [ Monitoring / AI Service ]
        |                              |
        | stores policy, logs,         | fetches Kamino position,
        | limits and history           | oracle data and volatility
        |                              |
        |                              v
        |                       [ LLM Decision Engine ]
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
        +--> Jupiter
        +--> Oracle / Pyth
```

## MVP Scope

To keep the hackathon build focused:
- 1 lending protocol: `Kamino`
- 1 collateral asset: `SOL`
- 1 debt asset: `USDC`
- 3 main actions:
  - `DO_NOTHING`
  - `REPAY_FROM_BUFFER`
  - `REPAY_WITH_COLLATERAL`

## Demo Scenario

The demo should show a complete end-to-end loop:

1. A user opens or imports a risky Kamino position.
2. The user enables AI Guard and sets a policy.
3. The user funds a safety buffer.
4. The system detects increased liquidation risk.
5. The AI returns a structured action.
6. The action is validated.
7. A real on-chain repayment or deleveraging transaction is executed.
8. The UI shows improved position health and the final transaction hash.

## Why It Fits The Hackathon

Borro Agent matches the `AI + Blockchain: Autonomous Smart Contracts` case because:
- AI is part of decision-making
- AI decisions lead to on-chain state changes
- the system is semi-autonomous or autonomous
- the project includes a deployed Solana program
- the demo can clearly show the full loop:

`AI -> decision -> transaction -> smart contract state change`

## Tech Stack

- `Solana`
- `Kamino`
- `Jupiter`
- `Pyth`
- `Anchor`
- `Next.js`
- `TypeScript`
- `OpenAI API`

## Repository Documents

- [Architecture & PRD](/Users/baki/Documents/AI Agents/Claude/projects/_active/Solhack/Borro_Agent_Architecture.md)
- [MVP Backlog](/Users/baki/Documents/AI Agents/Claude/projects/_active/Solhack/MVP_Backlog.md)
- [Signing and Custody Models](/Users/baki/Documents/AI Agents/Claude/projects/_active/Solhack/Signing_Custody_Models.md)
- [Hackathon Brief](/Users/baki/Documents/AI Agents/Claude/projects/_active/Solhack/National_Solana_Hackathon_Brief.md)

## One-Line Pitch

**Borro Agent is an autonomous AI guard for Solana lending positions that prevents liquidation by selecting and executing on-chain protective actions based on market conditions and user risk policy.**
