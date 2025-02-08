// Contract addresses for Base Sepolia
export const AAVE_POOL_ADDRESS = "0xbE781D7Bdf469f3d94a62Cdcc407aCe106AEcA74";
export const AAVE_L2_ENCODER = "0x0ffE481FBF0AE2282A5E1f701fab266aF487A97D";
export const AAVE_PROTOCOL_DATA_PROVIDER = "0xAF4646B0131af8fc0DC435AF7F7d303Ac131E072";

// Asset addresses for Base Sepolia
export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
// Updated WETH address for Base Sepolia
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";  // Base Sepolia WETH

// L2 Encoder ABI (verified)
export const L2_ENCODER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint16", name: "referralCode", type: "uint16" }
    ],
    name: "encodeSupplyParams",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "encodeWithdrawParams",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interestRateMode", type: "uint256" },
      { internalType: "uint16", name: "referralCode", type: "uint16" }
    ],
    name: "encodeBorrowParams",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interestRateMode", type: "uint256" }
    ],
    name: "encodeRepayParams",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Pool Implementation ABI (for proxy contract)
export const AAVE_POOL_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "args", type: "bytes32" }],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "args", type: "bytes32" }],
    name: "withdraw",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "args", type: "bytes32" }],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "args", type: "bytes32" }],
    name: "repay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// ERC20 Interface for WETH and USDC
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// Interest rate modes
export const INTEREST_RATE_MODES = {
  VARIABLE: 2,
  STABLE: 1,
} as const;