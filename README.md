# Aztec Prover Console

A web dashboard for scanning and claiming Aztec prover rewards — the GUI counterpart to
`prover-rewards.sh` / `rewards.js`.

## Features

- **Wallet connect** — wagmi + injected connector (MetaMask / Rabby / Frame).
- **Loading progress** — live multicall scan of an epoch range with a streaming progress bar.
- **Reward ledger table** — every epoch with a positive reward, its STK amount, and claim status.
- **Claim** — selects unclaimed epochs and submits `claimProverRewards(prover, epochs[])`,
  with tx + receipt status (Etherscan link).
- **Readouts** — claimable total, already-claimed total, reward shares (multiplier), current epoch.

## Run

```bash
cd dashboard
npm install
npm run dev      # http://localhost:5180
```

Other scripts: `npm run test` (Vitest), `npm run typecheck`, `npm run build`.

## Deploy (Vercel)

This repo is the app root, so Vercel deploys it zero-config:

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset auto-detects **Vite** (Build: `vite build`, Output: `dist`) — `vercel.json`
   pins these and adds an SPA fallback.
3. Deploy. No environment variables are required — connection settings (chain, RPC, rollup,
   prover) are entered in the UI at runtime and stored in the browser.

## Connection settings

Click the **Settings** gear (top right) to point the console at any deployment — no rebuild
needed. Chain name, **chain ID**, **RPC URL**, explorer URL, **rollup address**, default prover,
and token symbol are all editable and saved to `localStorage`. Changing the chain/RPC rebuilds the
wagmi client and reconnects. Defaults match `prover-rewards.sh` (mainnet rollup `0x603b…`,
`eth.drpc.org`); switch them to your `.env` target (e.g. rollup `0xae20…` + your node's RPC and
chain ID) from here.

## Saved history

Every scan is persisted to `localStorage`, keyed by **chain + rollup + prover** — the browser
equivalent of `rewards.js`'s `data/*.json` state. On load (or when you switch prover) the last
ledger is restored instantly with no network calls, and the table header shows when it was last
synced. Re-scanning a different epoch range **merges** over the saved ledger (the rescanned range
is authoritative for claim status; epochs outside it are kept), so coverage accumulates over time.
Use **Clear** in the table header to forget a prover's saved history.

## How it works

| Concern        | Implementation |
| -------------- | -------------- |
| Reads          | viem `multicall` over the Rollup contract (`getSpecificProverRewardsForEpoch`, `getHasClaimed`, `getSharesFor`, `getCurrentEpoch`) |
| Writes         | wagmi `useWriteContract` → `claimProverRewards` |
| Config         | Editable in the UI (gear → **Settings**), persisted to `localStorage`; defaults in `src/lib/settings.ts` |
| Scan logic     | `src/lib/scan.ts` (pure, unit-tested) |
| Scan driver    | `src/hooks/useRewardsScan.ts` |

The connected wallet is the **claimer** (`msg.sender`). It must be authorized to claim for the
prover address — same rule the shell script enforces.

> Note: unlike `wallets.json`, this dashboard never touches private keys. All signing happens in
> the user's wallet.
