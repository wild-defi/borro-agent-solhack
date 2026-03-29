use anchor_lang::prelude::*;

use crate::constants::{MAX_REASON_LENGTH, MAX_TX_SIGNATURE_LENGTH};

#[account]
#[derive(InitSpace)]
pub struct PolicyAccount {
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub owner: Pubkey,
    pub agent_authority: Pubkey,
    pub kamino_obligation: Pubkey,
    pub buffer_mint: Pubkey,
    pub risk_profile: u8,
    pub allowed_actions: u16,
    pub target_health_factor_bps: u16,
    pub max_repay_per_action_usd: u64,
    pub max_daily_intervention_usd: u64,
    pub cooldown_seconds: u32,
    pub is_enabled: bool,
    pub is_paused: bool,
    pub last_intervention_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct DecisionLogAccount {
    pub bump: u8,
    pub policy: Pubkey,
    pub last_decision_id: u64,
    pub action: u16,
    pub requested_amount_usd: u64,
    pub executed_amount_usd: u64,
    pub target_health_factor_bps: u16,
    pub confidence_bps: u16,
    pub executor: Pubkey,
    #[max_len(MAX_REASON_LENGTH)]
    pub reason: String,
    #[max_len(MAX_TX_SIGNATURE_LENGTH)]
    pub tx_signature: String,
    pub created_at: i64,
    pub updated_at: i64,
}
