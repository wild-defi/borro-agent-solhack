pub const POLICY_SEED: &[u8] = b"policy";
pub const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";
pub const DECISION_LOG_SEED: &[u8] = b"decision_log";

pub const ACTION_DO_NOTHING: u16 = 1 << 0;
pub const ACTION_REPAY_FROM_BUFFER: u16 = 1 << 1;
pub const ACTION_REPAY_WITH_COLLATERAL: u16 = 1 << 2;
pub const ACTION_PARTIAL_DELEVERAGE: u16 = 1 << 3;
pub const ALL_ACTIONS_MASK: u16 = ACTION_DO_NOTHING
    | ACTION_REPAY_FROM_BUFFER
    | ACTION_REPAY_WITH_COLLATERAL
    | ACTION_PARTIAL_DELEVERAGE;

pub const MAX_REASON_LENGTH: usize = 160;
pub const MAX_TX_SIGNATURE_LENGTH: usize = 88;
pub const BPS_DENOMINATOR: u16 = 10_000;
