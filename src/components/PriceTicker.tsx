import { useTokenPrice } from '../hooks/useTokenPrice';
import { formatUsd, PRICE_SYMBOL } from '../lib/price';
import { Sparkline } from './Sparkline';

/** Compact AZTEC price ticker for the top bar: price, 30d sparkline, 24h change. */
export function PriceTicker() {
  const { data, isLoading } = useTokenPrice();

  if (isLoading && !data) {
    return <div className="ticker ticker-loading">AZTEC ···</div>;
  }
  if (!data) return null;

  const up = data.priceChange24h >= 0;
  return (
    <div className="ticker" title={`${PRICE_SYMBOL} · 30d`}>
      <span className="ticker-sym">{PRICE_SYMBOL}</span>
      <span className="ticker-price">{formatUsd(data.currentPrice)}</span>
      <Sparkline data={data.history.map((h) => h.price)} color={up ? 'var(--lime)' : 'var(--red)'} />
      <span className={`ticker-chg ${up ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {Math.abs(data.priceChange24h).toFixed(2)}%
      </span>
    </div>
  );
}
