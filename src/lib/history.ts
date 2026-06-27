import type { EpochRow } from './scan';

/** localStorage-safe shape (bigint reward serialized as a decimal string). */
export type StoredRow = { epoch: number; reward: string; claimed: boolean };

/** A persisted scan, accumulated across runs for one chain/rollup/prover. */
export type ScanRecord = {
  chainId: number;
  rollup: string;
  prover: string;
  start: number;
  end: number;
  updatedAt: number; // epoch ms
  rows: StoredRow[];
};

const PREFIX = 'aztec-console-history.v1';

/** Storage key scoped to a chain + rollup + prover (lowercased addresses). */
export function historyKey(chainId: number, rollup: string, prover: string): string {
  return `${PREFIX}:${chainId}:${rollup.toLowerCase()}:${prover.toLowerCase()}`;
}

export function serializeRows(rows: EpochRow[]): StoredRow[] {
  return rows.map((r) => ({ epoch: r.epoch, reward: r.reward.toString(), claimed: r.claimed }));
}

export function deserializeRows(rows: StoredRow[]): EpochRow[] {
  return rows.map((r) => ({ epoch: r.epoch, reward: BigInt(r.reward), claimed: r.claimed }));
}

/**
 * Merge a fresh scan over the cached ledger. The freshly-scanned range
 * [start, end] is authoritative (rewards may have been claimed since); epochs
 * outside that range are preserved from the cache — so repeated scans of
 * different ranges accumulate, mirroring rewards.js `finalizedByEpoch`.
 */
export function mergeRows(cached: EpochRow[], fresh: EpochRow[], start: number, end: number): EpochRow[] {
  const map = new Map<number, EpochRow>();
  for (const r of cached) {
    if (r.epoch < start || r.epoch > end) map.set(r.epoch, r);
  }
  for (const r of fresh) map.set(r.epoch, r);
  return [...map.values()].sort((a, b) => b.epoch - a.epoch);
}

export function loadRecord(key: string): ScanRecord | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ScanRecord) : null;
  } catch {
    return null;
  }
}

export function saveRecord(key: string, record: ScanRecord): void {
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function clearRecord(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
