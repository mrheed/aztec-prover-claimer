import { describe, it, expect } from 'vitest';
import {
  formatToken,
  formatInt,
  shortAddress,
  sharesToMultiplier,
  timeAgo,
} from './format';

describe('formatToken', () => {
  it('formats whole-token wei with truncated decimals', () => {
    expect(formatToken(1_500_000_000_000_000_000n)).toBe('1.5000');
  });

  it('truncates rather than rounds extra decimals', () => {
    expect(formatToken(123_456_000_000_000_000n, 4)).toBe('0.1234');
  });

  it('groups thousands in the integer part', () => {
    expect(formatToken(12_345_000_000_000_000_000_000n, 2)).toBe('12,345.00');
  });

  it('supports zero decimals', () => {
    expect(formatToken(5_000_000_000_000_000_000n, 0)).toBe('5');
  });
});

describe('formatInt', () => {
  it('groups thousands', () => {
    expect(formatInt(1_000_000n)).toBe('1,000,000');
  });
});

describe('shortAddress', () => {
  it('shortens an address to 0x1234…abcd', () => {
    expect(shortAddress('0x4c8701c14b802b4b0eae3df4074fd68a457ce507')).toBe(
      '0x4c87…e507',
    );
  });

  it('returns a dash for empty input', () => {
    expect(shortAddress(undefined)).toBe('—');
  });
});

describe('sharesToMultiplier', () => {
  it('renders 1e5 shares as 1.00×', () => {
    expect(sharesToMultiplier(100_000n)).toBe('1.00×');
  });

  it('renders 1e6 shares as 10.00×', () => {
    expect(sharesToMultiplier(1_000_000n)).toBe('10.00×');
  });
});

describe('timeAgo', () => {
  const base = 1_000_000_000_000;
  it('says "just now" under 45s', () => {
    expect(timeAgo(base, base + 10_000)).toBe('just now');
  });
  it('reports minutes', () => {
    expect(timeAgo(base, base + 5 * 60_000)).toBe('5m ago');
  });
  it('reports hours', () => {
    expect(timeAgo(base, base + 2 * 3_600_000)).toBe('2h ago');
  });
  it('reports days', () => {
    expect(timeAgo(base, base + 3 * 86_400_000)).toBe('3d ago');
  });
});
