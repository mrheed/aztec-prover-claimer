/**
 * Static on-chain interface for the Aztec Rollup rewards system.
 * Connection details (chain, RPC, rollup address, default prover) are
 * runtime-editable — see src/lib/settings.ts.
 */

// Reward token metadata. Decimals are fixed by the token; the symbol is a label
// and can be overridden in settings for display.
export const TOKEN = { symbol: 'STK', decimals: 18 } as const;

/**
 * Minimal Rollup ABI: only the functions the console reads and writes.
 */
export const ROLLUP_ABI = [
  {
    name: 'getCurrentEpoch',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getSpecificProverRewardsForEpoch',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'epoch', type: 'uint256' },
      { name: 'prover', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getHasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'prover', type: 'address' },
      { name: 'epoch', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getSharesFor',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'prover', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'claimProverRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'prover', type: 'address' },
      { name: 'epochs', type: 'uint256[]' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;
