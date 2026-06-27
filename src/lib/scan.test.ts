import { describe, it, expect } from 'vitest';
import {
  buildEpochRange,
  chunk,
  totalClaimable,
  totalClaimed,
  claimableEpochs,
  mapWithConcurrency,
  type EpochRow,
} from './scan';

const rows: EpochRow[] = [
  { epoch: 1, reward: 10n, claimed: false }, // claimable
  { epoch: 2, reward: 5n, claimed: true }, // already claimed
  { epoch: 3, reward: 0n, claimed: false }, // empty
  { epoch: 4, reward: 7n, claimed: false }, // claimable
];

describe('buildEpochRange', () => {
  it('builds an inclusive range', () => {
    expect(buildEpochRange(3, 6)).toEqual([3, 4, 5, 6]);
  });
  it('returns empty when start > end', () => {
    expect(buildEpochRange(6, 3)).toEqual([]);
  });
});

describe('chunk', () => {
  it('splits into fixed-size groups', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('throws on non-positive size', () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe('reward aggregation', () => {
  it('sums only unclaimed positive rewards', () => {
    expect(totalClaimable(rows)).toBe(17n);
  });
  it('sums only claimed positive rewards', () => {
    expect(totalClaimed(rows)).toBe(5n);
  });
  it('lists claimable epoch numbers', () => {
    expect(claimableEpochs(rows)).toEqual([1, 4]);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order regardless of resolution timing', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      await new Promise((r) => setTimeout(r, (5 - n) * 5));
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it('never runs more than `limit` workers at once', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('reports cumulative progress', async () => {
    const seen: number[] = [];
    await mapWithConcurrency([1, 2, 3], 1, async (n) => n, (done) => seen.push(done));
    expect(seen).toEqual([1, 2, 3]);
  });
});
