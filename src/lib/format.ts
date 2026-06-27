import { formatUnits, type Address } from 'viem';
import { TOKEN } from '../contract';

/** Format a wei bigint to a fixed-decimal token string (truncated, like rewards.js). */
export function formatToken(wei: bigint, maxDecimals = 4): string {
  const full = formatUnits(wei, TOKEN.decimals);
  const [int, frac = ''] = full.split('.');
  const intFmt = Number(int).toLocaleString('en-US');
  if (maxDecimals === 0) return intFmt;
  const fracTrim = frac.slice(0, maxDecimals).padEnd(maxDecimals, '0');
  return `${intFmt}.${fracTrim}`;
}

/** Compact integer formatting (e.g. shares). */
export function formatInt(n: bigint | number): string {
  return Number(n).toLocaleString('en-US');
}

/** Shorten an EVM address: 0x1234…abcd */
export function shortAddress(addr?: Address | string): string {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Render shares (1e5 == 1.0x) as a multiplier label. */
export function sharesToMultiplier(shares: bigint): string {
  return `${(Number(shares) / 100_000).toFixed(2)}×`;
}

/** Coarse relative time, e.g. "just now", "5m ago", "2h ago", "3d ago". */
export function timeAgo(then: number, now: number): string {
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
