import { formatToken, formatInt, sharesToMultiplier } from '../lib/format';
import { useSettings } from '../lib/settings';

type Props = {
  currentEpoch?: bigint;
  shares?: bigint;
  claimableTotal: bigint;
  claimableCount: number;
  claimedTotal: bigint;
};

/** Four instrument-style readouts across the top of the console. */
export function StatCards({ currentEpoch, shares, claimableTotal, claimableCount, claimedTotal }: Props) {
  const { settings } = useSettings();
  const symbol = settings.tokenSymbol;
  return (
    <div className="stats">
      <div className="stat panel accent">
        <div className="stat-label">
          <span className="tick" style={{ background: 'var(--lime)' }} />
          Claimable Now
        </div>
        <div className="stat-value">
          {formatToken(claimableTotal, 3)}
          <small>{symbol}</small>
        </div>
        <div className="stat-sub">{claimableCount} unclaimed epochs</div>
      </div>

      <div className="stat panel">
        <div className="stat-label">Already Claimed</div>
        <div className="stat-value">
          {formatToken(claimedTotal, 3)}
          <small>{symbol}</small>
        </div>
        <div className="stat-sub">settled rewards</div>
      </div>

      <div className="stat panel amber">
        <div className="stat-label">Reward Shares</div>
        <div className="stat-value">{shares != null ? sharesToMultiplier(shares) : '—'}</div>
        <div className="stat-sub">{shares != null ? `${formatInt(shares)} shares` : 'connect to read'}</div>
      </div>

      <div className="stat panel">
        <div className="stat-label">Current Epoch</div>
        <div className="stat-value">{currentEpoch != null ? `#${formatInt(currentEpoch)}` : '—'}</div>
        <div className="stat-sub">rollup head</div>
      </div>
    </div>
  );
}
