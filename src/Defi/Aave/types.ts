export enum AaveErrorCodes {
    INSUFFICIENT_COLLATERAL = "INSUFFICIENT_COLLATERAL",
    HEALTH_FACTOR_TOO_LOW = "HEALTH_FACTOR_TOO_LOW",
    INSUFFICIENT_LIQUIDITY = "INSUFFICIENT_LIQUIDITY",
    // Add more error codes as needed
  }
  
  export type AaveError = {
    code: AaveErrorCodes;
    message: string;
  };
  
  export interface UserReserveData {
    currentATokenBalance: bigint;
    currentStableDebt: bigint;
    currentVariableDebt: bigint;
    principalStableDebt: bigint;
    scaledVariableDebt: bigint;
    stableBorrowRate: bigint;
    liquidityRate: bigint;
    stableRateLastUpdated: number;
    usageAsCollateralEnabled: boolean;
  }
  
  export interface ReserveConfigurationData {
    decimals: bigint;
    ltv: bigint;
    liquidationThreshold: bigint;
    liquidationBonus: bigint;
    reserveFactor: bigint;
    usageAsCollateralEnabled: boolean;
    borrowingEnabled: boolean;
    stableBorrowRateEnabled: boolean;
    isActive: boolean;
    isFrozen: boolean;
  }
  
  export interface ReserveData {
    unbacked: bigint;
    accruedToTreasuryScaled: bigint;
    totalAToken: bigint;
    totalStableDebt: bigint;
    totalVariableDebt: bigint;
    liquidityRate: bigint;
    variableBorrowRate: bigint;
    stableBorrowRate: bigint;
    averageStableBorrowRate: bigint;
    liquidityIndex: bigint;
    variableBorrowIndex: bigint;
    lastUpdateTimestamp: number;
  }
  
  export interface UserAccountData {
    totalCollateralBase: bigint;
    totalDebtBase: bigint;
    availableBorrowsBase: bigint;
    currentLiquidationThreshold: bigint;
    ltv: bigint;
    healthFactor: bigint;
  }