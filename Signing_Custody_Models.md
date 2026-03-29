# Borro Agent - Signing and Custody Models

This document captures three workable signing and custody models for `Borro Agent`, their trade-offs, and rough implementation effort.

---

## 1. Context

For `Borro Agent`, we need to define:
- which wallet the user controls
- which signer the agent controls
- who signs protective on-chain actions
- how the agent's authority is constrained

On Solana, the term `EOA` is not commonly used. The closest equivalent is a standard `Keypair` signer.

It is also important to clarify:
- a `PDA` is not a normal agent wallet
- a `PDA` does not have a private key
- a `PDA` can only sign through program logic and `invoke_signed`

---

## 2. Model 1. App-Controlled Agent Wallet

### Idea

The user connects `Phantom` or `Backpack`, while the agent uses a separate backend signer owned by the application.

### How It Works

1. The user connects a wallet.
2. The user enables `AI Guard`.
3. The user configures a policy.
4. The user funds the `safety buffer`.
5. The backend agent uses its own signer to initiate protective transactions within the application's execution model.

### Who Signs

- user: onboarding, policy setup, buffer funding
- agent: protective execution

### Agent Wallet Type

A standard backend `Solana Keypair`.

### Pros

- fastest to implement
- lowest infrastructure complexity
- easy to demo
- very suitable for a hackathon MVP

### Cons

- weaker custody and security story
- trust assumptions need to be explained carefully
- not the strongest long-term production model

### When to Choose It

Best choice for the **MVP**.

### Estimated Effort

- wallet and signing setup: `2-4 hours`
- backend signing flow: `3-5 hours`
- integration and debugging: `4-8 hours`

**Total:** `9-17 hours`

---

## 3. Model 2. Delegated Signer on the User Wallet

### Idea

The user grants the app a restricted signer that can act on the user's behalf only within a predefined policy.

### How It Works

1. The user connects a wallet.
2. The user grants delegated signer access to the application.
3. The policy constrains:
   - allowed actions
   - limits
   - cooldown
   - scope of use
4. The agent signs actions on behalf of the user wallet even while the user is offline.

### Who Signs

- user: initial approval and delegation
- agent: subsequent protective actions within policy

### Candidate Solutions

- `Privy`
- `Turnkey`

### Pros

- stronger product story for a true agent wallet flow
- better fit for offline actions
- easier to explain that the agent acts only within user-granted permissions

### Cons

- significantly more integration complexity
- more wallet-infrastructure risk
- can consume a large part of the hackathon timeline

### When to Choose It

Better for **v2** or a stronger final architecture, but risky as the first milestone when time is limited.

### Estimated Effort

#### Overall

- minimum: `24-32 hours`
- realistic: `40-60 hours`
- with integration surprises: `60-80 hours`

This assumes one experienced full-stack/web3 engineer and excludes production hardening.

#### Breakdown

**Wallet and signing infrastructure**
- auth and wallet integration: `6-10 hours`
- delegated signer and permission layer: `8-14 hours`
- real transaction signing and debugging: `6-10 hours`

Subtotal:
- `20-34 hours`

**AI layer**
- schema: `1-2 hours`
- prompts and decision logic: `2-4 hours`
- guardrails and validation: `4-6 hours`
- AI to execution integration: `3-5 hours`

Subtotal:
- `10-17 hours`

**Kamino integration**
- read position: `3-5 hours`
- repay flow: `4-8 hours`
- debugging: `4-8 hours`

Subtotal:
- `11-21 hours`

**UI**
- onboarding: `3-5 hours`
- policy form: `2-4 hours`
- dashboard and history: `4-8 hours`

Subtotal:
- `9-17 hours`

### Privy vs. Turnkey

**Privy**
- usually faster for a user-wallet delegated flow
- estimated wallet/delegation layer: `16-28 hours`

**Turnkey**
- stronger as a general agent-wallet and policy-engine infrastructure
- estimated wallet/delegation layer: `20-36 hours`

### Bottom Line for Model 2

This model is realistic, but expensive in time. The hardest part is not the AI; it is the signing and custody infrastructure.

---

## 4. Model 3. Program-Managed Smart Account or Vault

### Idea

The agent does not rely on the user's normal private key. Control is built around a custom `Anchor program`, vault logic, and on-chain policy enforcement.

### How It Works

1. The user creates a managed vault or smart-account-style setup.
2. Policy is stored on-chain.
3. The agent can execute only allowed actions through a program-mediated flow.
4. Logs and limits live on-chain.

### Who Signs

- user: vault and policy creation
- agent: execution through an allowed architecture
- program: enforcement of constraints

### Agent Wallet Type

Not necessarily a standard wallet. The architecture is built around:
- `Anchor program`
- `PDA`
- controlled execution flow

Important: a `PDA` does not replace a backend signer when an off-chain signer is still required.

### Pros

- strongest on-chain architecture
- strongest transparency story
- best conceptual fit for the `AI + Blockchain` case
- policy and audit trail are verifiable on-chain

### Cons

- most complex to implement
- more time required for design and debugging
- risky as the very first MVP milestone

### When to Choose It

Best path for the **final architecture** after a working MVP already exists.

### Estimated Effort

- Anchor vault and policy design: `10-16 hours`
- program implementation: `12-20 hours`
- client integration: `8-14 hours`
- execution debugging: `8-16 hours`

**Total:** `38-66 hours`

If AI, UI, and Kamino execution are added on top as the first milestone, the total can easily reach `60-90+ hours`.

---

## 5. Comparison Table

| Model | Speed | Complexity | Security Story | Hackathon Fit | Recommendation |
| ----- | ----- | ----- | ----- | ----- | ----- |
| App-Controlled Agent Wallet | High | Low | Moderate to weak | Very good | Best choice for MVP |
| Delegated Signer on User Wallet | Medium to low | Medium to high | Good | Good, but schedule-risky | Better for v2 |
| Program-Managed Smart Account / Vault | Low | High | Very strong | Strong story, high delivery risk | Final architecture |

---

## 6. Recommendation for Borro Agent

### For the MVP

Use:
- user wallet: `Phantom`
- agent signer: backend keypair
- `Borro Guard Program` for policy, logs, and buffer logic

Why:
- fastest path
- proves the core loop:
  `AI -> decision -> validation -> on-chain action`
- delivers a real demo without overengineering

### For Post-MVP / v2

Move toward:
- `Privy` or `Turnkey`

If the priority is:
- faster delegated-signer implementation: favor `Privy`
- stronger agent-wallet infrastructure and policy story: favor `Turnkey`

### For the Long-Term Version

Evolve toward:
- `Anchor`-managed vault and policy architecture
- stricter on-chain enforcement
- richer execution paths

---

## 7. Final Takeaway

If the goal is to ship a strong working hackathon MVP, the best sequence is:

1. build model 1 first
2. improve the custody and signing story through model 2
3. evolve toward model 3 in the final architecture

In other words:

`fast MVP -> delegated signer upgrade -> on-chain managed architecture`
