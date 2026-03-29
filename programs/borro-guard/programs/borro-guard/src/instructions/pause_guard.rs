use anchor_lang::prelude::*;

use crate::{errors::BorroGuardError, state::PolicyAccount};

#[derive(Accounts)]
pub struct PauseGuard<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ BorroGuardError::Unauthorized
    )]
    pub policy: Account<'info, PolicyAccount>,
}

pub fn handler(ctx: Context<PauseGuard>, is_paused: bool) -> Result<()> {
    let clock = Clock::get()?;
    let policy = &mut ctx.accounts.policy;

    policy.is_paused = is_paused;
    policy.updated_at = clock.unix_timestamp;

    Ok(())
}
