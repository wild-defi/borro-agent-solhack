use anchor_lang::prelude::*;

use crate::{
    constants::{
        ALL_ACTIONS_MASK, DECISION_LOG_SEED, MAX_REASON_LENGTH, MAX_TX_SIGNATURE_LENGTH,
    },
    errors::BorroGuardError,
    state::{DecisionLogAccount, PolicyAccount},
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecordDecisionArgs {
    pub action: u16,
    pub requested_amount_usd: u64,
    pub executed_amount_usd: u64,
    pub target_health_factor_bps: u16,
    pub confidence_bps: u16,
    pub reason: String,
    pub tx_signature: String,
}

#[derive(Accounts)]
pub struct RecordDecision<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub policy: Account<'info, PolicyAccount>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + DecisionLogAccount::INIT_SPACE,
        seeds = [DECISION_LOG_SEED, policy.key().as_ref()],
        bump
    )]
    pub decision_log: Account<'info, DecisionLogAccount>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RecordDecision>, args: RecordDecisionArgs) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    let authority = ctx.accounts.authority.key();

    require!(
        authority == policy.owner || authority == policy.agent_authority,
        BorroGuardError::Unauthorized
    );
    require!(!policy.is_paused, BorroGuardError::GuardPaused);
    require!(
        args.action != 0 && (args.action & !ALL_ACTIONS_MASK) == 0,
        BorroGuardError::InvalidAction
    );
    require!(
        (policy.allowed_actions & args.action) != 0,
        BorroGuardError::ActionNotAllowed
    );
    require!(
        args.reason.len() <= MAX_REASON_LENGTH,
        BorroGuardError::ReasonTooLong
    );
    require!(
        args.tx_signature.len() <= MAX_TX_SIGNATURE_LENGTH,
        BorroGuardError::TxSignatureTooLong
    );

    let clock = Clock::get()?;
    let decision_log = &mut ctx.accounts.decision_log;

    if decision_log.policy == Pubkey::default() {
        decision_log.bump = ctx.bumps.decision_log;
        decision_log.policy = policy.key();
        decision_log.created_at = clock.unix_timestamp;
    }

    decision_log.last_decision_id = decision_log.last_decision_id.saturating_add(1);
    decision_log.action = args.action;
    decision_log.requested_amount_usd = args.requested_amount_usd;
    decision_log.executed_amount_usd = args.executed_amount_usd;
    decision_log.target_health_factor_bps = args.target_health_factor_bps;
    decision_log.confidence_bps = args.confidence_bps;
    decision_log.executor = authority;
    decision_log.reason = args.reason;
    decision_log.tx_signature = args.tx_signature;
    decision_log.updated_at = clock.unix_timestamp;

    policy.last_intervention_at = clock.unix_timestamp;
    policy.updated_at = clock.unix_timestamp;

    Ok(())
}
