# Aave Protocol Action Provider

The Aave Protocol Action Provider enables interaction with Aave V3 on the Base Sepolia network. This provider allows AI agents to perform lending and borrowing operations using the Aave protocol's L2-optimized contracts.

## Table of Contents
- [Features](#features)
- [Supported Assets](#supported-assets)
- [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Error Handling](#error-handling)
- [Important Considerations](#important-considerations)
- [Contract Addresses](#contract-addresses)
- [Development and Testing](#development-and-testing)
- [References](#references)

## Features

- **Supply assets as collateral**: Users can supply various assets to be used as collateral for borrowing.
- **Borrow against supplied collateral**: Allows users to borrow funds based on the collateral they have supplied.
- **Repay borrowed positions**: Users can repay their borrowed amounts at any time.
- **Withdraw supplied assets**: Users can withdraw their supplied assets when needed.
- **Real-time position monitoring**: Keep track of your positions and health factors in real-time.
- **Gas-optimized for L2 networks**: Designed to minimize gas costs on Layer 2 networks.

## Supported Assets

Currently supports the following assets on Base Sepolia:
- USDC
- WETH

## Prerequisites

1. **Base Sepolia network connection**: Ensure you are connected to the Base Sepolia network.
2. **Sufficient asset balance for operations**: Make sure you have enough assets for the operations you want to perform.
3. **ETH for gas fees**: You will need ETH to cover transaction fees.

## Usage

### Supply Assets

```typescript
const result = await aaveProvider.supplyAsset(wallet, {
    asset: "USDC",
    amount: "1000000" // 1 USDC (6 decimals)
});
```

### Borrow Assets

```typescript
const result = await aaveProvider.borrowAsset(wallet, {
    asset: "USDC",
    amount: "1000000" // 1 USDC (6 decimals)
});
```

### Repay Borrowed Position

```typescript
const result = await aaveProvider.repayBorrow(wallet, {
    asset: "USDC",
    amount: "1000000" // 1 USDC (6 decimals)
});
``` 

### Withdraw Supplied Assets

```typescript
const result = await aaveProvider.withdrawAsset(wallet, {
    asset: "USDC",
    amount: "1000000" // 1 USDC (6 decimals)    
});
```

## Error Handling

The provider implements comprehensive error handling with detailed error messages:

```typescript
try {
    await aaveProvider.supplyAsset(wallet, params);
} catch (error) {
    if (error instanceof AaveError) {
        console.log(`Error Code: ${error.code}`);
        console.log(`Message: ${error.message}`);
        console.log(`Details: ${error.details}`);
    } else {
        console.log(`Unexpected error: ${error}`);
    }
}
```

### Common Error Codes
- `INSUFFICIENT_BALANCE`: Not enough tokens for the operation.
- `HEALTH_FACTOR_TOO_LOW`: Operation would risk liquidation.
- `INSUFFICIENT_COLLATERAL`: Not enough collateral for borrowing.
- `MARKET_FROZEN`: Market temporarily unavailable.

## Important Considerations

1. **Health Factor**: Maintain a health factor above 1 to avoid liquidation. Regularly check your health factor after each transaction.
2. **Market Conditions**: Check current interest rates before borrowing to ensure favorable terms.
3. **Gas Optimization**: Uses L2-optimized contracts for reduced gas costs; monitor gas prices before executing transactions.
4. **Asset Caps**: Be aware of supply and borrow caps for each asset to avoid transaction failures.

## Contract Addresses

- Aave Pool: `0xbE781D7Bdf469f3d94a62Cdcc407aCe106AEcA74`
- L2 Encoder: `0x0ffE481FBF0AE2282A5E1f701fab266aF487A97D`
- Protocol Data Provider: `0xAF4646B0131af8fc0DC435AF7F7d303Ac131E072`

## Development and Testing

Run tests:
```bash
npm test -- src/action-providers/aavetest/aaveprotocolActionProvider.test.ts
```

## References

- [Aave V3 Documentation](https://docs.aave.com/developers/v/2.0/)
- [Base Sepolia Network](https://docs.base.org/base-sepolia)
- [L2 Pool Documentation](https://docs.aave.com/developers/v/2.0/deployed-contracts/l2-pool)