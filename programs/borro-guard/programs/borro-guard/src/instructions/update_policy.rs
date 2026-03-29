use anchor_lang::prelude::*;

use crate::{
    errors::BorroGuardError,
    instructions::initialize_policy::validate_policy_fields,
    state::PolicyAccount,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePolicyArgs {
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
pub struct UpdatePolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ BorroGuardError::Unauthorized
    )]
    pub policy: Account<'info, PolicyAccount>,
}

pub fn handler(ctx: Context<UpdatePolicy>, args: UpdatePolicyArgs) -> Result<()> {
    validate_policy_fields(
        args.risk_profile,
        args.allowed_actions,
        args.target_health_factor_bps,
    )?;

    let clock = Clock::get()?;
    let policy = &mut ctx.accounts.policy;

    policy.agent_authority = args.agent_authority;
    policy.risk_profile = args.risk_profile;
    policy.allowed_actions = args.allowed_actions;
    policy.target_health_factor_bps = args.target_health_factor_bps;
    policy.max_repay_per_action_usd = args.max_repay_per_action_usd;
    policy.max_daily_intervention_usd = args.max_daily_intervention_usd;
    policy.cooldown_seconds = args.cooldown_seconds;
    policy.is_enabled = args.is_enabled;
    policy.updated_at = clock.unix_timestamp;

    Ok(())
}
