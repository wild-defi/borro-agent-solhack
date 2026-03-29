use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    constants::VAULT_AUTHORITY_SEED,
    errors::BorroGuardError,
    state::PolicyAccount,
};

#[derive(Accounts)]
pub struct DepositBuffer<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ BorroGuardError::Unauthorized,
        constraint = policy.buffer_mint == buffer_mint.key() @ BorroGuardError::BufferMintMismatch
    )]
    pub policy: Account<'info, PolicyAccount>,
    pub buffer_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = owner_buffer_account.owner == owner.key() @ BorroGuardError::Unauthorized,
        constraint = owner_buffer_account.mint == buffer_mint.key() @ BorroGuardError::BufferMintMismatch
    )]
    pub owner_buffer_account: Account<'info, TokenAccount>,
    /// CHECK: PDA authority for the policy vault.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, policy.key().as_ref()],
        bump = policy.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = buffer_mint,
        associated_token::authority = vault_authority
    )]
    pub buffer_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositBuffer>, amount: u64) -> Result<()> {
    require!(amount > 0, BorroGuardError::InvalidAmount);
    require!(!ctx.accounts.policy.is_paused, BorroGuardError::GuardPaused);

    let cpi_accounts = Transfer {
        from: ctx.accounts.owner_buffer_account.to_account_info(),
        to: ctx.accounts.buffer_vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)
}
