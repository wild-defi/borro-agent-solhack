use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("7XZ4WDsPMAiJwVGpt52QVk69mQ5HqjcMcobwEyh4s9gv");

#[program]
pub mod borro_guard {
    use super::*;

    pub fn initialize_policy(
        ctx: Context<InitializePolicy>,
        args: InitializePolicyArgs,
    ) -> Result<()> {
        instructions::initialize_policy::handler(ctx, args)
    }

    pub fn update_policy(ctx: Context<UpdatePolicy>, args: UpdatePolicyArgs) -> Result<()> {
        instructions::update_policy::handler(ctx, args)
    }

    pub fn pause_guard(ctx: Context<PauseGuard>, is_paused: bool) -> Result<()> {
        instructions::pause_guard::handler(ctx, is_paused)
    }

    pub fn deposit_buffer(ctx: Context<DepositBuffer>, amount: u64) -> Result<()> {
        instructions::deposit_buffer::handler(ctx, amount)
    }

    pub fn withdraw_buffer(ctx: Context<WithdrawBuffer>, amount: u64) -> Result<()> {
        instructions::withdraw_buffer::handler(ctx, amount)
    }

    pub fn record_decision(
        ctx: Context<RecordDecision>,
        args: RecordDecisionArgs,
    ) -> Result<()> {
        instructions::record_decision::handler(ctx, args)
    }
}
