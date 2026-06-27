import { describe, it, expect } from 'vitest';
import {
  historyKey,
  serializeRows,
  deserializeRows,
  mergeRows,
} from './history';
import type { EpochRow } from './scan';

describe('historyKey', () => {
  it('scopes by chain + rollup + prover and lowercases addresses', () => {
    expect(historyKey(1, '0xAbC', '0xDeF')).toBe('aztec-console-history.v1:1:0xabc:0xdef');
  });
});

describe('row (de)serialization', () => {
  it('round-trips bigint rewards through strings', () => {
    const rows: EpochRow[] = [{ epoch: 7, reward: 123_456_789_000_000_000_000n, claimed: true }];
    expect(deserializeRows(serializeRows(rows))).toEqual(rows);
  });
});

describe('mergeRows', () => {
  const cached: EpochRow[] = [
    { epoch: 10, reward: 5n, claimed: false },
    { epoch: 20, reward: 8n, claimed: false },
    { epoch: 30, reward: 3n, claimed: false },
  ];

  it('keeps cached epochs outside the rescanned range', () => {
    // Rescan only [20,20]: epoch 10 and 30 must survive.
    const fresh: EpochRow[] = [{ epoch: 20, reward: 8n, claimed: true }];
    const out = mergeRows(cached, fresh, 20, 20);
    expect(out.map((r) => r.epoch)).toEqual([30, 20, 10]);
  });

  it('lets the rescanned range override stale claim status', () => {
    const fresh: EpochRow[] = [{ epoch: 20, reward: 8n, claimed: true }];
    const out = mergeRows(cached, fresh, 20, 20);
    expect(out.find((r) => r.epoch === 20)?.claimed).toBe(true);
  });

  it('drops in-range cached epochs no longer present (reward gone)', () => {
    // Rescan [10,30] returns nothing in range -> all in-range cached removed.
    const out = mergeRows(cached, [], 10, 30);
    expect(out).toEqual([]);
  });

  it('returns newest-first', () => {
    const out = mergeRows([], cached, 10, 30);
    expect(out.map((r) => r.epoch)).toEqual([30, 20, 10]);
  });
});
