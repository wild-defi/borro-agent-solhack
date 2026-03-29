import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { BorroGuard } from "../target/types/borro_guard";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}

const POLICY_SEED = "policy";
const DECISION_LOG_SEED = "decision_log";

const ACTION_DO_NOTHING = 1 << 0;
const ACTION_REPAY_FROM_BUFFER = 1 << 1;
const ACTION_REPAY_WITH_COLLATERAL = 1 << 2;

describe("borro-guard", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.borroGuard as Program<BorroGuard>;
  const owner = provider.wallet;

  const bufferMint = anchor.web3.Keypair.generate().publicKey;
  const kaminoObligation = anchor.web3.Keypair.generate().publicKey;
  const initialAgentAuthority = anchor.web3.Keypair.generate().publicKey;
  const updatedAgentAuthority = anchor.web3.Keypair.generate().publicKey;

  const [policyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(POLICY_SEED),
      owner.publicKey.toBuffer(),
      kaminoObligation.toBuffer(),
    ],
    program.programId
  );

  const [decisionLogPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(DECISION_LOG_SEED), policyPda.toBuffer()],
    program.programId
  );

  before(async () => {
    const signature = await provider.connection.requestAirdrop(
      owner.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature, "confirmed");
  });

  it("initializes a policy", async () => {
    await program.methods
      .initializePolicy({
        kaminoObligation,
        bufferMint,
        agentAuthority: initialAgentAuthority,
        riskProfile: 1,
        allowedActions: ACTION_DO_NOTHING | ACTION_REPAY_FROM_BUFFER,
        targetHealthFactorBps: 12500,
        maxRepayPerActionUsd: new anchor.BN(500),
        maxDailyInterventionUsd: new anchor.BN(1500),
        cooldownSeconds: 300,
        isEnabled: true,
      })
      .accountsPartial({
        owner: owner.publicKey,
        bufferMint,
        policy: policyPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const policy = await program.account.policyAccount.fetch(policyPda);

    expect(policy.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(policy.agentAuthority.toBase58()).to.equal(
      initialAgentAuthority.toBase58()
    );
    expect(policy.kaminoObligation.toBase58()).to.equal(
      kaminoObligation.toBase58()
    );
    expect(policy.bufferMint.toBase58()).to.equal(bufferMint.toBase58());
    expect(policy.allowedActions).to.equal(
      ACTION_DO_NOTHING | ACTION_REPAY_FROM_BUFFER
    );
    expect(policy.targetHealthFactorBps).to.equal(12500);
    expect(policy.isEnabled).to.equal(true);
    expect(policy.isPaused).to.equal(false);
  });

  it("updates a policy", async () => {
    await program.methods
      .updatePolicy({
        agentAuthority: updatedAgentAuthority,
        riskProfile: 2,
        allowedActions:
          ACTION_DO_NOTHING |
          ACTION_REPAY_FROM_BUFFER |
          ACTION_REPAY_WITH_COLLATERAL,
        targetHealthFactorBps: 14000,
        maxRepayPerActionUsd: new anchor.BN(800),
        maxDailyInterventionUsd: new anchor.BN(2400),
        cooldownSeconds: 900,
        isEnabled: false,
      })
      .accountsPartial({
        owner: owner.publicKey,
        policy: policyPda,
      })
      .rpc();

    const policy = await program.account.policyAccount.fetch(policyPda);

    expect(policy.agentAuthority.toBase58()).to.equal(
      updatedAgentAuthority.toBase58()
    );
    expect(policy.riskProfile).to.equal(2);
    expect(policy.allowedActions).to.equal(
      ACTION_DO_NOTHING |
        ACTION_REPAY_FROM_BUFFER |
        ACTION_REPAY_WITH_COLLATERAL
    );
    expect(policy.targetHealthFactorBps).to.equal(14000);
    expect(policy.maxRepayPerActionUsd.toNumber()).to.equal(800);
    expect(policy.maxDailyInterventionUsd.toNumber()).to.equal(2400);
    expect(policy.cooldownSeconds).to.equal(900);
    expect(policy.isEnabled).to.equal(false);
  });

  it("pauses and unpauses the guard", async () => {
    await program.methods
      .pauseGuard(true)
      .accountsPartial({
        owner: owner.publicKey,
        policy: policyPda,
      })
      .rpc();

    let policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.isPaused).to.equal(true);

    await program.methods
      .pauseGuard(false)
      .accountsPartial({
        owner: owner.publicKey,
        policy: policyPda,
      })
      .rpc();

    policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.isPaused).to.equal(false);
  });

  it("records a decision log", async () => {
    await program.methods
      .recordDecision({
        action: ACTION_REPAY_FROM_BUFFER,
        requestedAmountUsd: new anchor.BN(420),
        executedAmountUsd: new anchor.BN(400),
        targetHealthFactorBps: 13200,
        confidenceBps: 8700,
        reason: "Volatility increased and the position needs repayment.",
        txSignature: "5N8tBorroGuardDecision111111111111111111111111111111111",
      })
      .accountsPartial({
        authority: owner.publicKey,
        policy: policyPda,
        decisionLog: decisionLogPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const decisionLog =
      await program.account.decisionLogAccount.fetch(decisionLogPda);
    const policy = await program.account.policyAccount.fetch(policyPda);

    expect(decisionLog.policy.toBase58()).to.equal(policyPda.toBase58());
    expect(decisionLog.lastDecisionId.toNumber()).to.equal(1);
    expect(decisionLog.action).to.equal(ACTION_REPAY_FROM_BUFFER);
    expect(decisionLog.requestedAmountUsd.toNumber()).to.equal(420);
    expect(decisionLog.executedAmountUsd.toNumber()).to.equal(400);
    expect(decisionLog.targetHealthFactorBps).to.equal(13200);
    expect(decisionLog.confidenceBps).to.equal(8700);
    expect(decisionLog.executor.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(decisionLog.reason).to.contain("Volatility increased");
    expect(policy.lastInterventionAt.toNumber()).to.be.greaterThan(0);
  });
});
