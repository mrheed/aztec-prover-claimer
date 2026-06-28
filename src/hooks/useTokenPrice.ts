import { useQuery } from '@tanstack/react-query';
import { PRICE_API, PRICE_SYMBOL, type TokenPriceData } from '../lib/price';

/**
 * Fetch the AZTEC token price (current + 24h change + history) from dashtec's
 * public, CORS-enabled feed. Cached + lightly polled via React Query.
 */
export function useTokenPrice(days = 30) {
  return useQuery<TokenPriceData>({
    queryKey: ['token-price', PRICE_SYMBOL, days],
    queryFn: async () => {
      const res = await fetch(`${PRICE_API}?symbol=${PRICE_SYMBOL}&days=${days}`);
      if (!res.ok) throw new Error(`price feed ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
