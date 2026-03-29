# Borro Agent - Architecture & PRD

## 1. Product Vision

**Name:** Borro Agent

**Product summary:** Borro Agent is an autonomous non-custodial AI risk manager for lending positions in Kamino Finance on Solana. It continuously monitors a user's borrowing position, evaluates liquidation risk, and executes protective on-chain actions before the position reaches a critical state. In the broader product vision, the same agent framework can also support carry trade strategies on top of lending markets.

**Core value:** Instead of reacting after liquidation becomes unavoidable, Borro Agent provides predictive risk protection. Traditional liquidators step in too late and protect the protocol, not the borrower. Borro Agent evaluates volatility, oracle confidence, position health, and user-defined risk policy to reduce liquidation risk through repayment or deleveraging before the position becomes unsafe. The same decision engine can later be extended to manage yield-oriented strategies such as carry trades, where the agent maintains borrowing and lending positions within predefined risk boundaries.

**Hackathon thesis:** This is not a simple `if/else` bot. Borro Agent is an AI agent that chooses among multiple protection strategies and triggers a real on-chain transaction. The full loop is:

`market + position data -> AI decision -> policy validation -> on-chain transaction -> updated lending state`

---

## 2. Core Use Case

The user deposits a volatile asset such as `SOL`, `BTC`, or `ETH` and borrows `USDC`.

**Problem**
- the collateral price can fall quickly
- `LTV` rises
- the position approaches liquidation
- the user may be offline and unable to react in time

**Solution**
- Borro Agent monitors the position and market conditions
- predicts elevated liquidation risk
- chooses a protective action
- executes an on-chain transaction within a user-approved policy
- can later reuse the same policy, monitoring, and execution layers for carry trade strategy management

---

## 3. What AI Does vs. What Deterministic Logic Does

To avoid looking like a standard liquidation bot, Borro Agent separates decision-making from safety enforcement.

**AI layer**
- analyzes position state and market conditions
- chooses a protection strategy
- proposes a target `health factor` or `LTV`
- explains the reason for the action

**Deterministic validation layer**
- verifies that the action is allowed by policy
- caps the operation amount
- checks cooldown rules
- verifies safety buffer availability
- blocks unsafe actions even if the AI proposed them

AI chooses the strategy. Backend logic and on-chain guardrails enforce execution safety.

---

## 4. Full Product Flow

### 4.1 Onboarding

1. The user opens the web app and connects a wallet such as `Phantom` or `Backpack`.
2. The app displays the current `Kamino` position:
   - collateral
   - debt
   - current `LTV`
   - current `health factor`
   - liquidation threshold
3. The user clicks `Enable AI Guard`.
4. The user signs a transaction that creates a `Policy Account` in the Borro `Anchor program`.
5. The user configures protection settings:
   - `risk_profile`: `conservative / balanced / aggressive`
   - `target_health_factor`
   - `allowed_actions`
   - `max_repay_per_action`
   - `max_daily_intervention_usd`
   - `cooldown_seconds`
6. The user may optionally deposit reserve funds into a `Safety Buffer Vault`:
   - for example, `USDC` that can be used for fast repayment without selling collateral

### 4.2 Monitoring

A server daemon or cron job collects the following every 1 to 5 minutes.

**On-chain data**
- current `LTV` and `health factor` from `Kamino SDK`
- collateral and debt composition
- current safety buffer balance
- `Policy Account` state
- history of recent interventions

**Off-chain data**
- current prices and oracle confidence
- short-term volatility
- market trend
- optional sentiment or macro signal

### 4.3 Decision-Making

The collected data is sent to the LLM as structured input.

The AI must choose exactly one action:
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

### 4.4 Validation Layer

The backend never executes the raw model output directly.

It validates:
- whether `action` is included in `allowed_actions`
- whether `repay_amount_usdc` exceeds policy limits
- whether `cooldown` has expired
- whether the `safety buffer` is sufficient
- whether the collateral sale share is within limits
- whether the daily cap has been reached

If the output is invalid, the action is rejected or reduced to a safe range.

### 4.5 Execution

If the decision passes validation, the bot or executor builds the on-chain transaction.

**A. Repay from buffer**
1. Use `USDC` from the `Safety Buffer Vault`
2. Call `Kamino.repay()`

**B. Repay with collateral**
1. Call `Kamino.withdraw()` to withdraw part of the collateral
2. Call `Jupiter.swap()` to swap collateral into `USDC`
3. Call `Kamino.repay()` to reduce debt

**C. Partial deleverage**
1. Withdraw only the required portion of the collateral
2. Sell that portion into `USDC`
3. Repay enough debt to restore the target `health factor`

### 4.6 Logging and Transparency

Every decision should be recorded in:
- a `Decision Log Account` in the Borro `Anchor program`
- an off-chain audit log for the UI

Each record stores:
- a position snapshot
- hash of the input data
- AI decision
- reason
- executed action
- transaction signature
- timestamp

This strengthens the main case-2 narrative: AI does not just recommend an action, it transparently triggers an on-chain state change.

---

## 5. Why This Is Not Just a Liquidation Script

A standard bot operates like this:
- `if health factor < threshold -> execute fixed action`

Borro Agent behaves differently:
- it chooses among multiple strategies
- it respects the user's risk profile
- it uses predictive signals, not just a single threshold
- it may use a safety buffer before selling collateral
- all actions are policy-constrained and logged on-chain

That is why Borro Agent should be framed as an **Autonomous Lending Risk Manager**, not a liquidation script.

---

## 6. System Architecture

```text
[ User / Browser ]
          |
          | connect wallet, configure policy, view history
          v
[ Next.js App ]
          |
          +------------------------------+
          |                              |
          v                              v
[ Anchor Program: Borro Guard ]      [ Monitoring / AI Service ]
          |                              |
          | stores policy, logs,         | fetches Kamino position data,
          | limits, and buffer rules     | oracle data, volatility, sentiment
          |                              |
          |                              v
          |                        [ LLM Decision Engine ]
          |                              |
          |                        returns structured decision
          |                              |
          +<--------- validation --------+
          |
          v
[ Transaction Executor ]
          |
          | builds repay / deleverage tx
          v
[ Solana Blockchain ]
          |
          +--> [ Kamino Lending ]
          +--> [ Jupiter ]
          +--> [ Pyth / Oracle ]
```

---

## 7. Borro Guard On-Chain Program

To align strongly with the hackathon case, the project should include its own deployed program, not just a Kamino integration.

### 7.1 Program State

**Policy Account**
- owner
- Kamino obligation id
- risk profile
- target health factor
- allowed actions
- max repay per action
- max daily intervention
- cooldown
- enabled flag

**Safety Buffer Vault**
- user-specific `USDC` reserve
- used for quick repayment without immediate collateral sales

**Decision Log Account**
- last decision id
- action
- amount
- reason hash or compact reason
- tx signature
- timestamp

### 7.2 Core Instructions

**`initialize_policy`**
- creates the policy account

**`update_policy`**
- updates risk settings

**`deposit_buffer`**
- funds the safety buffer

**`withdraw_buffer`**
- lets the user withdraw unused buffer funds

**`record_decision`**
- stores the AI decision and execution metadata

**`pause_guard`**
- provides an emergency stop for the user

### 7.3 Why the Program Matters

- it satisfies the hackathon requirement for a deployed program
- it makes the system transparent and verifiable
- it provides a clear enforcement point for policy constraints
- it improves the product narrative beyond an off-chain script

---

## 8. AI Decision Model

### 8.1 Input Features

- collateral asset
- debt asset
- collateral value
- debt value
- current `LTV`
- current `health factor`
- distance to liquidation
- short-term realized volatility
- oracle confidence
- trend score
- available safety buffer
- user risk profile
- recent intervention history

### 8.2 Output Schema

```json
{
  "action": "DO_NOTHING | REPAY_FROM_BUFFER | REPAY_WITH_COLLATERAL | PARTIAL_DELEVERAGE",
  "target_health_factor": 1.25,
  "repay_amount_usdc": 0,
  "collateral_to_sell": "SOL",
  "confidence": 0.0,
  "reason": "Short explanation"
}
```

### 8.3 Guardrails

- the AI cannot execute arbitrary actions
- the AI must choose from a predefined action set
- backend logic and the program cap amount and intervention frequency
- when confidence is low, the system should either do nothing or choose the least risky option

---

## 9. Data Sources and Integrations

### 9.1 Required

- `Kamino SDK` for position reads and repay/deleverage execution
- `Jupiter` for collateral-to-`USDC` swaps
- `Pyth` or another oracle for price and confidence data
- `OpenAI API` or another LLM for structured decision-making

### 9.2 Optional

- `CoinGecko` for market context
- news or sentiment signal
- Telegram or push notifications

---

## 10. Hackathon MVP Scope

To stay within timeline, the MVP should remain intentionally narrow.

### 10.1 MVP Constraints

- 1 lending protocol: `Kamino`
- 1 collateral asset: `SOL`
- 1 debt asset: `USDC`
- 3 actions:
  - `DO_NOTHING`
  - `REPAY_FROM_BUFFER`
  - `REPAY_WITH_COLLATERAL`

### 10.2 What the Demo Must Show

1. The user connects a wallet.
2. The user creates an `AI Guard Policy`.
3. The user funds the `Safety Buffer Vault` with test `USDC`.
4. The app shows the current Kamino position.
5. The AI receives a position snapshot and returns a structured decision.
6. The system validates the decision.
7. A real on-chain transaction is sent.
8. The UI shows the updated `health factor`, action history, and transaction signature.

### 10.3 What Can Be Simplified

- if atomic `withdraw + swap + repay` is too difficult, the MVP can focus on `REPAY_FROM_BUFFER`
- `REPAY_WITH_COLLATERAL` can remain an advanced path or semi-mocked demo
- sentiment can be skipped if the MVP already includes:
  - oracle price
  - volatility
  - user policy

---

## 11. Requirements to Fit Case 2

To clearly satisfy `AI + Blockchain: Autonomous Smart Contracts`, the demo should include all four:

1. **AI makes a real decision**
   - not a hardcoded threshold
   - not just an alert

2. **The decision leads to an on-chain action**
   - `repay`
   - `withdraw + swap + repay`

3. **There is a deployed program**
   - the Borro Guard Program

4. **There is transparency**
   - policy
   - decision logs
   - UI explanation of why the agent took the action

---

## 12. UX / UI

A simple dashboard built with `Next.js + Tailwind`:

**Position screen**
- collateral
- debt
- `LTV`
- `health factor`
- liquidation risk badge

**Protection screen**
- AI Guard enabled/disabled
- selected risk profile
- allowed actions
- safety buffer balance

**History screen**
- last AI decision
- reason
- executed action
- amount repaid
- tx signature

Example state:

`Current HF: 1.14 -> AI target HF: 1.32 -> Action: Repay from buffer -> Status: Executed`

---

## 13. Implementation Plan

### Day 1: Core protocol integration
1. Set up a `Next.js + TypeScript` project.
2. Connect `@solana/web3.js` and `Kamino SDK`.
3. Read the user's position:
   - collateral
   - debt
   - `LTV`
   - `health factor`
4. Display the position in the UI.

### Day 2: Borro Guard program
5. Create the `Anchor program`.
6. Implement:
   - `initialize_policy`
   - `update_policy`
   - `deposit_buffer`
   - `record_decision`
   - `pause_guard`
7. Connect policy accounts to the UI.

### Day 3: AI and validation
8. Define the structured schema for AI output.
9. Build a backend module that:
   - collects the snapshot
   - sends it to the LLM
   - receives decision JSON
   - validates the result against policy

### Day 4: Execution
10. Implement `REPAY_FROM_BUFFER`.
11. If time allows, add `REPAY_WITH_COLLATERAL` through `Jupiter`.
12. Log results through `Decision Log`.

### Day 5: Demo polish
13. Display decision history.
14. Add execution states:
   - monitoring
   - decision ready
   - validating
   - executing
   - executed
15. Prepare the demo flow:
   - risky position
   - AI intervention
   - on-chain repay
   - improved health factor

---

## 14. One-Paragraph Pitch

Borro Agent is an autonomous AI risk manager for lending positions on Solana. The user defines a risk policy and allocates a safety buffer, after which the agent continuously analyzes the Kamino position, market volatility, and oracle confidence, chooses a protection strategy, and triggers on-chain actions to prevent liquidation. Every action is constrained by the user's policy, logged through a dedicated Solana program, and results in a real position state change, which makes the product a strong fit for the `AI + Blockchain: Autonomous Smart Contracts` case.
