/** A single epoch's reward + claim status for a prover. */
export type EpochRow = {
  epoch: number;
  reward: bigint;
  claimed: boolean;
};

/** Build an inclusive [start, end] list of epoch numbers. Empty if start > end. */
export function buildEpochRange(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];
  const out: number[] = [];
  for (let e = start; e <= end; e++) out.push(e);
  return out;
}

/** Split an array into fixed-size chunks (last chunk may be smaller). */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be > 0');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Sum the rewards of the rows the user may still claim (reward > 0 && !claimed). */
export function totalClaimable(rows: EpochRow[]): bigint {
  return rows.reduce((acc, r) => (r.reward > 0n && !r.claimed ? acc + r.reward : acc), 0n);
}

/** Sum the rewards already claimed. */
export function totalClaimed(rows: EpochRow[]): bigint {
  return rows.reduce((acc, r) => (r.reward > 0n && r.claimed ? acc + r.reward : acc), 0n);
}

/** Epoch numbers that are claimable (used to pre-select rows + build claim tx). */
export function claimableEpochs(rows: EpochRow[]): number[] {
  return rows.filter((r) => r.reward > 0n && !r.claimed).map((r) => r.epoch);
}

/**
 * Run an async mapper over items with a bounded number of concurrent workers,
 * preserving input order. Mirrors the mapWithConcurrency helper in rewards.js —
 * many cheap individual eth_calls instead of a single Multicall3 aggregate, so
 * it works on any chain regardless of whether Multicall3 is deployed.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let completed = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));

  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
      completed++;
      onProgress?.(completed);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
