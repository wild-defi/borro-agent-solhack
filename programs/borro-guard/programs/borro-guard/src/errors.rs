use anchor_lang::prelude::*;

#[error_code]
pub enum BorroGuardError {
    #[msg("The signer is not authorized to perform this action.")]
    Unauthorized,
    #[msg("The provided risk profile is invalid.")]
    InvalidRiskProfile,
    #[msg("The allowed actions mask is invalid.")]
    InvalidAllowedActions,
    #[msg("The target health factor is invalid.")]
    InvalidTargetHealthFactor,
    #[msg("The amount must be greater than zero.")]
    InvalidAmount,
    #[msg("The provided action is invalid.")]
    InvalidAction,
    #[msg("The requested action is not allowed by policy.")]
    ActionNotAllowed,
    #[msg("The provided reason is too long.")]
    ReasonTooLong,
    #[msg("The provided transaction signature is too long.")]
    TxSignatureTooLong,
    #[msg("The policy is paused.")]
    GuardPaused,
    #[msg("The provided buffer mint does not match the policy.")]
    BufferMintMismatch,
}
