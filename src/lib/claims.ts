import type { EpochRow } from './scan';

/** One permanently-recorded claim (reward serialized as a decimal string). */
export type ClaimedEntry = {
  epoch: number;
  reward: string;
  claimedAt: number; // epoch ms when first recorded
  txHash?: string; // claim transaction, when known
};

/** Append-only claims ledger for one chain/rollup/prover. */
export type ClaimsRecord = {
  chainId: number;
  rollup: string;
  prover: string;
  entries: ClaimedEntry[];
};

const PREFIX = 'aztec-console-claims.v1';

/** Storage key scoped to a chain + rollup + prover (lowercased addresses). */
export function claimsKey(chainId: number, rollup: string, prover: string): string {
  return `${PREFIX}:${chainId}:${rollup.toLowerCase()}:${prover.toLowerCase()}`;
}

/** Load the permanent claims ledger; never throws, missing ledger is []. */
export function loadClaims(key: string): ClaimedEntry[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ClaimsRecord).entries : [];
  } catch {
    return [];
  }
}

/**
 * Merge new claims into the ledger without ever removing an entry. Existing
 * entries win (first record is the historical truth) except a missing txHash,
 * which is back-filled when a later write knows it. Returns the merged list.
 */
export function mergeClaims(existing: ClaimedEntry[], incoming: ClaimedEntry[]): ClaimedEntry[] {
  const byEpoch = new Map<number, ClaimedEntry>(existing.map((e) => [e.epoch, e]));
  for (const entry of incoming) {
    const prev = byEpoch.get(entry.epoch);
    if (!prev) byEpoch.set(entry.epoch, entry);
    else if (!prev.txHash && entry.txHash) byEpoch.set(entry.epoch, { ...prev, txHash: entry.txHash });
  }
  return [...byEpoch.values()].sort((a, b) => b.epoch - a.epoch);
}

/** Persist merged claims to the ledger. There is deliberately no delete API. */
export function addClaims(
  key: string,
  ctx: { chainId: number; rollup: string; prover: string },
  incoming: ClaimedEntry[],
): ClaimedEntry[] {
  const merged = mergeClaims(loadClaims(key), incoming);
  try {
    localStorage.setItem(key, JSON.stringify({ ...ctx, entries: merged } satisfies ClaimsRecord));
  } catch {
    /* ignore quota / private-mode errors */
  }
  return merged;
}

/**
 * Overlay the permanent ledger onto scan rows: every recorded epoch is forced
 * `claimed: true`, and recorded epochs missing from the rows are re-added with
 * their stored reward — so a claimed epoch can never disappear or flip back to
 * unclaimed, whatever a rescan or a cleared history says.
 */
export function applyClaims(rows: EpochRow[], entries: ClaimedEntry[]): EpochRow[] {
  if (entries.length === 0) return rows;
  const claimedByEpoch = new Map(entries.map((e) => [e.epoch, e]));
  const out = rows.map((r) => (claimedByEpoch.has(r.epoch) ? { ...r, claimed: true } : r));
  const present = new Set(rows.map((r) => r.epoch));
  for (const e of entries) {
    if (!present.has(e.epoch)) out.push({ epoch: e.epoch, reward: BigInt(e.reward), claimed: true });
  }
  return out.sort((a, b) => b.epoch - a.epoch);
}

/** Rows → ledger entries (used to harvest on-chain claimed rows during a scan). */
export function entriesFromRows(rows: EpochRow[], claimedAt: number, txHash?: string): ClaimedEntry[] {
  return rows.filter((r) => r.claimed).map((r) => ({ epoch: r.epoch, reward: r.reward.toString(), claimedAt, txHash }));
}
