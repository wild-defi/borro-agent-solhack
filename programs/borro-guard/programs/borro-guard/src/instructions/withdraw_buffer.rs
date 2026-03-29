use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    constants::VAULT_AUTHORITY_SEED,
    errors::BorroGuardError,
    state::PolicyAccount,
};

#[derive(Accounts)]
pub struct WithdrawBuffer<'info> {
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
        mut,
        token::mint = buffer_mint,
        token::authority = vault_authority
    )]
    pub buffer_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawBuffer>, amount: u64) -> Result<()> {
    require!(amount > 0, BorroGuardError::InvalidAmount);

    let policy_key = ctx.accounts.policy.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        VAULT_AUTHORITY_SEED,
        policy_key.as_ref(),
        &[ctx.accounts.policy.vault_authority_bump],
    ]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.buffer_vault.to_account_info(),
        to: ctx.accounts.owner_buffer_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        amount,
    )
}
