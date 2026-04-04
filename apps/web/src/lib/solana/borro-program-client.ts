"use client";

import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import type { AllowedAction, PolicyConfig, RiskProfile } from "@/lib/types";

const POLICY_SEED = "policy";
const VAULT_AUTHORITY_SEED = "vault_authority";
const DEFAULT_PROGRAM_ID = "7XZ4WDsPMAiJwVGpt52QVk69mQ5HqjcMcobwEyh4s9gv";
const textEncoder = new TextEncoder();
const MIN_POLICY_INIT_SOL = 0.003;
const MIN_POLICY_UPDATE_SOL = 0.0002;

const ACTION_MASKS: Record<AllowedAction, number> = {
  DO_NOTHING: 1 << 0,
  REPAY_FROM_BUFFER: 1 << 1,
  REPAY_WITH_COLLATERAL: 1 << 2,
  PARTIAL_DELEVERAGE: 1 << 3,
};

const RISK_PROFILE_CODES: Record<RiskProfile, number> = {
  conservative: 0,
  balanced: 1,
  aggressive: 2,
};

const BORRO_CLIENT_IDL = {
  address: DEFAULT_PROGRAM_ID,
  metadata: {
    name: "borro_guard",
    version: "0.1.0",
    spec: "0.1.0",
    description:
      "Borro Guard — on-chain policy, logging, and safety buffer for Borro Agent",
  },
  instructions: [
    {
      name: "initialize_policy",
      discriminator: [9, 186, 86, 225, 129, 162, 231, 56],
      accounts: [
        { name: "owner", writable: true, signer: true },
        { name: "buffer_mint" },
        { name: "policy", writable: true },
        { name: "vault_authority" },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [{ name: "args", type: { defined: { name: "InitializePolicyArgs" } } }],
    },
    {
      name: "update_policy",
      discriminator: [212, 245, 246, 7, 163, 151, 18, 57],
      accounts: [
        { name: "owner", writable: true, signer: true },
        { name: "policy", writable: true },
      ],
      args: [{ name: "args", type: { defined: { name: "UpdatePolicyArgs" } } }],
    },
    {
      name: "pause_guard",
      discriminator: [195, 202, 181, 62, 227, 48, 140, 15],
      accounts: [
        { name: "owner", writable: true, signer: true },
        { name: "policy", writable: true },
      ],
      args: [{ name: "is_paused", type: "bool" }],
    },
  ],
  accounts: [
    {
      name: "PolicyAccount",
      discriminator: [218, 201, 183, 164, 156, 127, 81, 175],
    },
  ],
  types: [
    {
      name: "InitializePolicyArgs",
      type: {
        kind: "struct",
        fields: [
          { name: "kamino_obligation", type: "pubkey" },
          { name: "buffer_mint", type: "pubkey" },
          { name: "agent_authority", type: "pubkey" },
          { name: "risk_profile", type: "u8" },
          { name: "allowed_actions", type: "u16" },
          { name: "target_health_factor_bps", type: "u16" },
          { name: "max_repay_per_action_usd", type: "u64" },
          { name: "max_daily_intervention_usd", type: "u64" },
          { name: "cooldown_seconds", type: "u32" },
          { name: "is_enabled", type: "bool" },
        ],
      },
    },
    {
      name: "UpdatePolicyArgs",
      type: {
        kind: "struct",
        fields: [
          { name: "agent_authority", type: "pubkey" },
          { name: "risk_profile", type: "u8" },
          { name: "allowed_actions", type: "u16" },
          { name: "target_health_factor_bps", type: "u16" },
          { name: "max_repay_per_action_usd", type: "u64" },
          { name: "max_daily_intervention_usd", type: "u64" },
          { name: "cooldown_seconds", type: "u32" },
          { name: "is_enabled", type: "bool" },
        ],
      },
    },
    {
      name: "PolicyAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "bump", type: "u8" },
          { name: "vault_authority_bump", type: "u8" },
          { name: "owner", type: "pubkey" },
          { name: "agent_authority", type: "pubkey" },
          { name: "kamino_obligation", type: "pubkey" },
          { name: "buffer_mint", type: "pubkey" },
          { name: "risk_profile", type: "u8" },
          { name: "allowed_actions", type: "u16" },
          { name: "target_health_factor_bps", type: "u16" },
          { name: "max_repay_per_action_usd", type: "u64" },
          { name: "max_daily_intervention_usd", type: "u64" },
          { name: "cooldown_seconds", type: "u32" },
          { name: "is_enabled", type: "bool" },
          { name: "is_paused", type: "bool" },
          { name: "last_intervention_at", type: "i64" },
          { name: "created_at", type: "i64" },
          { name: "updated_at", type: "i64" },
        ],
      },
    },
  ],
} as Idl;

interface RawPolicyAccount {
  riskProfile?: number;
  risk_profile?: number;
  allowedActions?: number;
  allowed_actions?: number;
  targetHealthFactorBps?: number;
  target_health_factor_bps?: number;
  maxRepayPerActionUsd?: BN | number;
  max_repay_per_action_usd?: BN | number;
  maxDailyInterventionUsd?: BN | number;
  max_daily_intervention_usd?: BN | number;
  cooldownSeconds?: number;
  cooldown_seconds?: number;
  isEnabled?: boolean;
  is_enabled?: boolean;
}

export interface BorroClientConfig {
  programId: string;
  agentAuthority: string;
  bufferMint: string;
}

export interface OnChainPolicyRecord {
  policyAddress: string;
  policy: PolicyConfig;
}

function getProgramId(): PublicKey {
  return new PublicKey(
    process.env.NEXT_PUBLIC_BORRO_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
}

function createProgram(connection: Connection, wallet: AnchorWallet) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new Program(BORRO_CLIENT_IDL, provider);
}

function getClusterLabel(connection: Connection): string {
  const endpoint = connection.rpcEndpoint;

  if (endpoint.includes("devnet")) {
    return "devnet";
  }

  if (endpoint.includes("mainnet")) {
    return "mainnet";
  }

  if (endpoint.includes("testnet")) {
    return "testnet";
  }

  return endpoint;
}

async function assertWalletCanPayFees(
  connection: Connection,
  wallet: AnchorWallet,
  requiredSol: number,
  actionLabel: string
) {
  const balanceLamports = await connection.getBalance(wallet.publicKey, "confirmed");
  const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

  if (balanceSol >= requiredSol) {
    return;
  }

  const clusterLabel = getClusterLabel(connection);

  throw new Error(
    `Your connected wallet only has ${balanceSol.toFixed(
      4
    )} SOL on ${clusterLabel}. ${actionLabel} needs about ${requiredSol.toFixed(
      4
    )} SOL to pay rent and transaction fees. Fund this wallet on ${clusterLabel} and try again.`
  );
}

function fromBps(value: number): number {
  return Number((value / 10_000).toFixed(2));
}

function toBps(value: number): number {
  return Math.round(value * 10_000);
}

function readNumber(value: BN | number | undefined, fallback = 0): number {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

function riskProfileFromCode(value: number): RiskProfile {
  switch (value) {
    case 0:
      return "conservative";
    case 2:
      return "aggressive";
    default:
      return "balanced";
  }
}

function maskToActions(mask: number): AllowedAction[] {
  const actions = (Object.entries(ACTION_MASKS) as Array<[AllowedAction, number]>)
    .filter(([, bit]) => (mask & bit) !== 0)
    .map(([action]) => action);

  return actions.length > 0 ? actions : ["DO_NOTHING"];
}

function actionsToMask(actions: AllowedAction[]): number {
  return actions.reduce((mask, action) => mask | ACTION_MASKS[action], 0);
}

function mapAccountToPolicy(account: RawPolicyAccount): PolicyConfig {
  return {
    enabled: account.isEnabled ?? account.is_enabled ?? true,
    riskProfile: riskProfileFromCode(
      account.riskProfile ?? account.risk_profile ?? 1
    ),
    allowedActions: maskToActions(
      account.allowedActions ?? account.allowed_actions ?? ACTION_MASKS.DO_NOTHING
    ),
    targetHealthFactor: fromBps(
      account.targetHealthFactorBps ?? account.target_health_factor_bps ?? 12_500
    ),
    maxRepayPerActionUsd: readNumber(
      account.maxRepayPerActionUsd ?? account.max_repay_per_action_usd,
      500
    ),
    maxDailyInterventionUsd: readNumber(
      account.maxDailyInterventionUsd ?? account.max_daily_intervention_usd,
      1_500
    ),
    cooldownSeconds: account.cooldownSeconds ?? account.cooldown_seconds ?? 300,
  };
}

export function derivePolicyPda(
  owner: string | PublicKey,
  obligationAddress: string | PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      textEncoder.encode(POLICY_SEED),
      new PublicKey(owner).toBuffer(),
      new PublicKey(obligationAddress).toBuffer(),
    ],
    getProgramId()
  );
}

export async function fetchPolicyConfig(
  connection: Connection,
  wallet: AnchorWallet,
  ownerAddress: string,
  obligationAddress: string
): Promise<OnChainPolicyRecord | null> {
  const program = createProgram(connection, wallet);
  const [policyPda] = derivePolicyPda(ownerAddress, obligationAddress);
  const account = await (program.account as {
    policyAccount: {
      fetchNullable: (address: PublicKey) => Promise<RawPolicyAccount | null>;
    };
  }).policyAccount.fetchNullable(policyPda);

  if (!account) {
    return null;
  }

  return {
    policyAddress: policyPda.toBase58(),
    policy: mapAccountToPolicy(account),
  };
}

export async function initializePolicyOnChain(params: {
  connection: Connection;
  wallet: AnchorWallet;
  obligationAddress: string;
  config: BorroClientConfig;
  policy: PolicyConfig;
}): Promise<{ signature: string; policyAddress: string }> {
  const { connection, wallet, obligationAddress, config, policy } = params;
  await assertWalletCanPayFees(
    connection,
    wallet,
    MIN_POLICY_INIT_SOL,
    "Enabling AI Guard on-chain"
  );
  const program = createProgram(connection, wallet);
  const [policyPda] = derivePolicyPda(wallet.publicKey, obligationAddress);
  const [vaultAuthority] = PublicKey.findProgramAddressSync(
    [textEncoder.encode(VAULT_AUTHORITY_SEED), policyPda.toBuffer()],
    getProgramId()
  );

  const signature = await (program.methods as Record<string, (...args: unknown[]) => {
    accounts: (accounts: Record<string, PublicKey>) => { rpc: () => Promise<string> };
  }>).initializePolicy({
    kaminoObligation: new PublicKey(obligationAddress),
    bufferMint: new PublicKey(config.bufferMint),
    agentAuthority: new PublicKey(config.agentAuthority),
    riskProfile: RISK_PROFILE_CODES[policy.riskProfile],
    allowedActions: actionsToMask(policy.allowedActions),
    targetHealthFactorBps: toBps(policy.targetHealthFactor),
    maxRepayPerActionUsd: new BN(policy.maxRepayPerActionUsd),
    maxDailyInterventionUsd: new BN(policy.maxDailyInterventionUsd),
    cooldownSeconds: policy.cooldownSeconds,
    isEnabled: policy.enabled,
  })
    .accounts({
      owner: wallet.publicKey,
      bufferMint: new PublicKey(config.bufferMint),
      policy: policyPda,
      vaultAuthority,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    signature,
    policyAddress: policyPda.toBase58(),
  };
}

export async function updatePolicyOnChain(params: {
  connection: Connection;
  wallet: AnchorWallet;
  policyAddress: string;
  config: BorroClientConfig;
  policy: PolicyConfig;
}): Promise<{ signature: string }> {
  const { connection, wallet, policyAddress, config, policy } = params;
  await assertWalletCanPayFees(
    connection,
    wallet,
    MIN_POLICY_UPDATE_SOL,
    "Updating AI Guard on-chain"
  );
  const program = createProgram(connection, wallet);

  const signature = await (program.methods as Record<string, (...args: unknown[]) => {
    accounts: (accounts: Record<string, PublicKey>) => { rpc: () => Promise<string> };
  }>).updatePolicy({
    agentAuthority: new PublicKey(config.agentAuthority),
    riskProfile: RISK_PROFILE_CODES[policy.riskProfile],
    allowedActions: actionsToMask(policy.allowedActions),
    targetHealthFactorBps: toBps(policy.targetHealthFactor),
    maxRepayPerActionUsd: new BN(policy.maxRepayPerActionUsd),
    maxDailyInterventionUsd: new BN(policy.maxDailyInterventionUsd),
    cooldownSeconds: policy.cooldownSeconds,
    isEnabled: policy.enabled,
  })
    .accounts({
      owner: wallet.publicKey,
      policy: new PublicKey(policyAddress),
    })
    .rpc();

  return { signature };
}
