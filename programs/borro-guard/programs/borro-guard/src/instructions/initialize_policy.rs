use anchor_lang::prelude::*;
use crate::{
    constants::{ALL_ACTIONS_MASK, BPS_DENOMINATOR, POLICY_SEED, VAULT_AUTHORITY_SEED},
    errors::BorroGuardError,
    state::PolicyAccount,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePolicyArgs {
    pub kamino_obligation: Pubkey,
    pub buffer_mint: Pubkey,
    pub agent_authority: Pubkey,
    pub risk_profile: u8,
    pub allowed_actions: u16,
    pub target_health_factor_bps: u16,
    pub max_repay_per_action_usd: u64,
    pub max_daily_intervention_usd: u64,
    pub cooldown_seconds: u32,
    pub is_enabled: bool,
}

#[derive(Accounts)]
#[instruction(args: InitializePolicyArgs)]
pub struct InitializePolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: Buffer mint is stored as a policy pubkey and validated during token flows.
    pub buffer_mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + PolicyAccount::INIT_SPACE,
        seeds = [POLICY_SEED, owner.key().as_ref(), args.kamino_obligation.as_ref()],
        bump
    )]
    pub policy: Account<'info, PolicyAccount>,
    /// CHECK: PDA authority for the policy's buffer vault.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, policy.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePolicy>, args: InitializePolicyArgs) -> Result<()> {
    require!(
        ctx.accounts.buffer_mint.key() == args.buffer_mint,
        BorroGuardError::BufferMintMismatch
    );
    validate_policy_fields(
        args.risk_profile,
        args.allowed_actions,
        args.target_health_factor_bps,
    )?;

    let clock = Clock::get()?;
    let policy = &mut ctx.accounts.policy;

    policy.bump = ctx.bumps.policy;
    policy.vault_authority_bump = ctx.bumps.vault_authority;
    policy.owner = ctx.accounts.owner.key();
    policy.agent_authority = args.agent_authority;
    policy.kamino_obligation = args.kamino_obligation;
    policy.buffer_mint = args.buffer_mint;
    policy.risk_profile = args.risk_profile;
    policy.allowed_actions = args.allowed_actions;
    policy.target_health_factor_bps = args.target_health_factor_bps;
    policy.max_repay_per_action_usd = args.max_repay_per_action_usd;
    policy.max_daily_intervention_usd = args.max_daily_intervention_usd;
    policy.cooldown_seconds = args.cooldown_seconds;
    policy.is_enabled = args.is_enabled;
    policy.is_paused = false;
    policy.last_intervention_at = 0;
    policy.created_at = clock.unix_timestamp;
    policy.updated_at = clock.unix_timestamp;

    Ok(())
}

pub fn validate_policy_fields(
    risk_profile: u8,
    allowed_actions: u16,
    target_health_factor_bps: u16,
) -> Result<()> {
    require!(risk_profile <= 2, BorroGuardError::InvalidRiskProfile);
    require!(
        allowed_actions != 0 && (allowed_actions & !ALL_ACTIONS_MASK) == 0,
        BorroGuardError::InvalidAllowedActions
    );
    require!(
        target_health_factor_bps > BPS_DENOMINATOR
            && target_health_factor_bps <= BPS_DENOMINATOR * 3,
        BorroGuardError::InvalidTargetHealthFactor
    );

    Ok(())
}
