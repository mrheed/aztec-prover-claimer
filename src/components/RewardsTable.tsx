import { motion } from 'framer-motion';
import type { EpochRow } from '../lib/scan';
import type { ScanMeta } from '../hooks/useRewardsScan';
import { formatToken, timeAgo } from '../lib/format';
import { useSettings } from '../lib/settings';
import { Check, Search } from './icons';

type Props = {
  rows: EpochRow[];
  selected: Set<number>;
  scanned: boolean;
  meta: ScanMeta | null;
  onToggle: (epoch: number) => void;
  onToggleAll: () => void;
  onClear: () => void;
};

/** The rewards ledger: every epoch with a positive reward, selectable for claiming. */
export function RewardsTable({ rows, selected, scanned, meta, onToggle, onToggleAll, onClear }: Props) {
  const { settings } = useSettings();
  const claimableCount = rows.filter((r) => !r.claimed).length;
  const allSelected = claimableCount > 0 && rows.filter((r) => !r.claimed).every((r) => selected.has(r.epoch));

  return (
    <div className="table-panel panel">
      <div className="table-head">
        <h2>Reward Ledger</h2>
        <div className="table-head-right">
          <span className="meta">
            {rows.length} epochs · {claimableCount} claimable
          </span>
          {meta && (
            <span className="sync-tag" title={`epochs ${meta.start}–${meta.end}`}>
              <span className="tick" style={{ background: 'var(--lime)' }} />
              {meta.restored ? 'saved' : 'synced'} {timeAgo(meta.updatedAt, Date.now())}
            </span>
          )}
          {rows.length > 0 && (
            <button className="link-btn" onClick={onClear} title="Forget saved history for this prover">
              Clear
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <Search className="icon" />
          <h3>{scanned ? 'No rewards in this range' : 'No scan yet'}</h3>
          <p>{scanned ? 'Try a different epoch range.' : 'Set a prover + range, then run a scan.'}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 48 }}>
                  <button
                    className={`checkbox ${allSelected ? 'on' : ''} ${claimableCount === 0 ? 'disabled' : ''}`}
                    onClick={onToggleAll}
                    disabled={claimableCount === 0}
                    aria-label="Select all claimable"
                  >
                    {allSelected && <Check />}
                  </button>
                </th>
                <th>Epoch</th>
                <th className="num">Reward ({settings.tokenSymbol})</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isSel = selected.has(r.epoch);
                return (
                  <motion.tr
                    key={r.epoch}
                    className={isSel ? 'is-selected' : ''}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.012, 0.4) }}
                  >
                    <td>
                      <button
                        className={`checkbox ${isSel ? 'on' : ''} ${r.claimed ? 'disabled' : ''}`}
                        onClick={() => !r.claimed && onToggle(r.epoch)}
                        disabled={r.claimed}
                        aria-label={`Select epoch ${r.epoch}`}
                      >
                        {isSel && <Check />}
                      </button>
                    </td>
                    <td className="epoch-cell">#{r.epoch}</td>
                    <td className="num reward-cell">{formatToken(r.reward, 4)}</td>
                    <td>
                      {r.claimed ? (
                        <span className="pill claimed">CLAIMED</span>
                      ) : (
                        <span className="pill claimable">CLAIMABLE</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
