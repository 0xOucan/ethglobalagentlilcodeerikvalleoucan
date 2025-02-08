// Define error codes
export enum AaveErrorCode {
    // Connection/Network Errors
    NETWORK_ERROR = "NETWORK_ERROR",
    UNSUPPORTED_NETWORK = "UNSUPPORTED_NETWORK",
  
    // Transaction Errors
    TRANSACTION_FAILED = "TRANSACTION_FAILED",
    INSUFFICIENT_ALLOWANCE = "INSUFFICIENT_ALLOWANCE",
  
    // Asset Errors
    UNSUPPORTED_ASSET = "UNSUPPORTED_ASSET",
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  
    // Protocol Errors
    INSUFFICIENT_COLLATERAL = "INSUFFICIENT_COLLATERAL",
    HEALTH_FACTOR_TOO_LOW = "HEALTH_FACTOR_TOO_LOW",
    BORROW_CAP_REACHED = "BORROW_CAP_REACHED",
    SUPPLY_CAP_REACHED = "SUPPLY_CAP_REACHED",
  
    // Market Errors
    MARKET_FROZEN = "MARKET_FROZEN",
    RESERVE_INACTIVE = "RESERVE_INACTIVE",
  
    // User Position Errors
    NO_DEBT_TO_REPAY = "NO_DEBT_TO_REPAY",
    NO_COLLATERAL_TO_WITHDRAW = "NO_COLLATERAL_TO_WITHDRAW",
  
    // Operation Errors
    INVALID_AMOUNT = "INVALID_AMOUNT",
    APPROVAL_FAILED = "APPROVAL_FAILED",
    SUPPLY_FAILED = "SUPPLY_FAILED",
    WITHDRAW_FAILED = "WITHDRAW_FAILED",
    BORROW_FAILED = "BORROW_FAILED",
    REPAY_FAILED = "REPAY_FAILED",
    AMOUNT_BELOW_MINIMUM = "AMOUNT_BELOW_MINIMUM",
}

// Define error messages map
const ERROR_MESSAGES: Record<AaveErrorCode, string> = {
    [AaveErrorCode.NETWORK_ERROR]: "Failed to connect to the network",
    [AaveErrorCode.UNSUPPORTED_NETWORK]: "This network is not supported by the Aave protocol",
    [AaveErrorCode.TRANSACTION_FAILED]: "Transaction failed to execute",
    [AaveErrorCode.INSUFFICIENT_ALLOWANCE]: "Insufficient token allowance",
    [AaveErrorCode.UNSUPPORTED_ASSET]: "This asset is not supported on this network",
    [AaveErrorCode.INSUFFICIENT_BALANCE]: "Insufficient balance for the operation",
    [AaveErrorCode.INSUFFICIENT_COLLATERAL]: "Insufficient collateral for the operation",
    [AaveErrorCode.HEALTH_FACTOR_TOO_LOW]: "Operation would put health factor below minimum",
    [AaveErrorCode.BORROW_CAP_REACHED]: "Borrow cap has been reached for this asset",
    [AaveErrorCode.SUPPLY_CAP_REACHED]: "Supply cap has been reached for this asset",
    [AaveErrorCode.MARKET_FROZEN]: "Market is currently frozen",
    [AaveErrorCode.RESERVE_INACTIVE]: "Reserve is not active",
    [AaveErrorCode.NO_DEBT_TO_REPAY]: "No debt to repay for this asset",
    [AaveErrorCode.NO_COLLATERAL_TO_WITHDRAW]: "No collateral available to withdraw",
    [AaveErrorCode.INVALID_AMOUNT]: "Invalid amount specified",
    [AaveErrorCode.APPROVAL_FAILED]: "Failed to approve token transfer",
    [AaveErrorCode.SUPPLY_FAILED]: "Failed to supply assets to Aave",
    [AaveErrorCode.WITHDRAW_FAILED]: "Failed to withdraw assets from Aave",
    [AaveErrorCode.BORROW_FAILED]: "Failed to borrow assets from Aave",
    [AaveErrorCode.REPAY_FAILED]: "Failed to repay borrowed assets",
    [AaveErrorCode.AMOUNT_BELOW_MINIMUM]: "Amount is below the minimum required for this operation",
};

/**
 * Custom error class for Aave protocol errors
 */
export class AaveError extends Error {
    constructor(
        public code: AaveErrorCode,
        public message: string,
        public details?: any,
    ) {
        super(message);
        this.name = "AaveError";
    }

    toString(): string {
        return `[${this.code}] ${this.message}${
            this.details ? `\nDetails: ${JSON.stringify(this.details, null, 2)}` : ""
        }`;
    }
}

/**
 * Creates an AaveError with the appropriate message for the given error code
 */
export const createAaveError = (code: AaveErrorCode, details?: unknown): AaveError => {
    return new AaveError(code, ERROR_MESSAGES[code], details);
};

// Add this helper function
export const isAaveError = (error: unknown): error is AaveError => {
    return error instanceof AaveError;
};