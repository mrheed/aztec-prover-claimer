import { formatUnits } from 'viem';
import { TOKEN } from '../contract';

/** dashtec public price feed (CORS-enabled). */
export const PRICE_API = 'https://dashtec.xyz/api/token-price';
export const PRICE_SYMBOL = 'AZTEC';

export type PricePoint = { timestamp: number; price: number };

/** Response shape of GET /api/token-price?symbol=AZTEC&days=N. */
export type TokenPriceData = {
  currentPrice: number;
  priceChange24h: number; // percent, e.g. -0.22
  history: PricePoint[];
};

/** USD value of a wei reward amount at a given token price. */
export function usdValue(wei: bigint, price: number, decimals = TOKEN.decimals): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Number(formatUnits(wei, decimals)) * price;
}

/** Format a USD amount — sub-dollar values get more precision (good for token prices). */
export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  const abs = Math.abs(n);
  const decimals = abs > 0 && abs < 1 ? 5 : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
