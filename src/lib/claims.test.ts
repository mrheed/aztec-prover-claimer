import { describe, it, expect } from 'vitest';
import { claimsKey, mergeClaims, applyClaims, entriesFromRows, type ClaimedEntry } from './claims';
import type { EpochRow } from './scan';

describe('claimsKey', () => {
  it('scopes by chain + rollup + prover and lowercases addresses', () => {
    expect(claimsKey(1, '0xAbC', '0xDeF')).toBe('aztec-console-claims.v1:1:0xabc:0xdef');
  });
});

describe('mergeClaims', () => {
  const existing: ClaimedEntry[] = [
    { epoch: 10, reward: '5', claimedAt: 1000, txHash: '0xaaa' },
    { epoch: 20, reward: '8', claimedAt: 2000 },
  ];

  it('never removes an entry — incoming only adds', () => {
    const out = mergeClaims(existing, [{ epoch: 30, reward: '3', claimedAt: 3000 }]);
    expect(out.map((e) => e.epoch)).toEqual([30, 20, 10]);
  });

  it('keeps the first-recorded entry for duplicate epochs', () => {
    const out = mergeClaims(existing, [{ epoch: 10, reward: '999', claimedAt: 9000 }]);
    expect(out.find((e) => e.epoch === 10)).toEqual(existing[0]);
  });

  it('back-fills a missing txHash without touching the original timestamp', () => {
    const out = mergeClaims(existing, [{ epoch: 20, reward: '8', claimedAt: 9000, txHash: '0xbbb' }]);
    expect(out.find((e) => e.epoch === 20)).toEqual({ epoch: 20, reward: '8', claimedAt: 2000, txHash: '0xbbb' });
  });
});

describe('applyClaims', () => {
  const entries: ClaimedEntry[] = [
    { epoch: 20, reward: '8', claimedAt: 2000 },
    { epoch: 40, reward: '6', claimedAt: 4000 },
  ];

  it('forces claimed=true on rows the ledger knows about', () => {
    const rows: EpochRow[] = [{ epoch: 20, reward: 8n, claimed: false }];
    expect(applyClaims(rows, entries).find((r) => r.epoch === 20)?.claimed).toBe(true);
  });

  it('re-adds recorded epochs a rescan dropped, with the stored reward', () => {
    const rows: EpochRow[] = [{ epoch: 30, reward: 3n, claimed: false }];
    const out = applyClaims(rows, entries);
    expect(out.map((r) => r.epoch)).toEqual([40, 30, 20]);
    expect(out.find((r) => r.epoch === 40)).toEqual({ epoch: 40, reward: 6n, claimed: true });
  });

  it('rebuilds claimed rows even from an empty ledger view (post-clear)', () => {
    const out = applyClaims([], entries);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.claimed)).toBe(true);
  });

  it('is a no-op with no recorded claims', () => {
    const rows: EpochRow[] = [{ epoch: 1, reward: 1n, claimed: false }];
    expect(applyClaims(rows, [])).toBe(rows);
  });
});

describe('entriesFromRows', () => {
  it('harvests only claimed rows and serializes rewards', () => {
    const rows: EpochRow[] = [
      { epoch: 1, reward: 5n, claimed: true },
      { epoch: 2, reward: 7n, claimed: false },
    ];
    expect(entriesFromRows(rows, 1234, '0xccc')).toEqual([
      { epoch: 1, reward: '5', claimedAt: 1234, txHash: '0xccc' },
    ]);
  });
});
