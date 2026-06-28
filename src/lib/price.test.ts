import { describe, it, expect } from 'vitest';
import { usdValue, formatUsd } from './price';

describe('usdValue', () => {
  it('converts a wei reward to USD at a price', () => {
    // 2 tokens (18 decimals) at $0.0132 -> 0.0264
    expect(usdValue(2_000_000_000_000_000_000n, 0.0132)).toBeCloseTo(0.0264, 6);
  });
  it('returns 0 for a non-positive price', () => {
    expect(usdValue(10n ** 18n, 0)).toBe(0);
  });
});

describe('formatUsd', () => {
  it('uses 5 decimals for sub-dollar values', () => {
    expect(formatUsd(0.013248)).toBe('$0.01325');
  });
  it('uses 2 decimals and grouping for larger values', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });
  it('handles zero', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });
});
