import { createContext, useContext } from 'react';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain, type Address } from 'viem';

/**
 * Runtime-editable connection settings. Defaults mirror the values used by
 * prover-rewards.sh; everything here can be overridden in the UI and is
 * persisted to localStorage.
 */
export type AppSettings = {
  chainName: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  rollupAddress: Address;
  defaultProver: Address;
  tokenSymbol: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  chainName: 'Ethereum',
  chainId: 1,
  rpcUrl: 'https://eth.drpc.org',
  explorerUrl: 'https://etherscan.io',
  rollupAddress: '0x603bb2c05D474794ea97805e8De69bCcFb3bCA12',
  defaultProver: '0x4c8701c14b802b4b0eae3df4074fd68a457ce507',
  tokenSymbol: 'STK',
};

const STORAGE_KEY = 'aztec-console-settings.v1';

/** Load persisted settings, merged over defaults (so new fields are filled in). */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persist settings to localStorage (best-effort). */
export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** A signature that changes only when the chain/RPC change — used to remount wagmi. */
export function configSignature(s: AppSettings): string {
  return `${s.chainId}|${s.rpcUrl}`;
}

/** Build a wagmi config from the current settings (custom chain + injected wallet). */
export function buildWagmiConfig(s: AppSettings) {
  const chain = defineChain({
    id: s.chainId,
    name: s.chainName || `Chain ${s.chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [s.rpcUrl] } },
    blockExplorers: s.explorerUrl
      ? { default: { name: 'Explorer', url: s.explorerUrl } }
      : undefined,
  });

  return createConfig({
    chains: [chain],
    connectors: [injected()],
    transports: { [chain.id]: http(s.rpcUrl, { batch: true }) },
  });
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof buildWagmiConfig>;
  }
}

/** Context exposing live settings + an updater to the whole tree. */
export type SettingsContextValue = {
  settings: AppSettings;
  update: (next: AppSettings) => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Access current settings + updater. Throws if used outside the provider. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsContext');
  return ctx;
}
