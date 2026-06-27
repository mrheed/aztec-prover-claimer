import { motion } from 'framer-motion';
import type { ScanState } from '../hooks/useRewardsScan';

/** Animated loading bar shown while a scan streams per-epoch read results. */
export function ScanProgress({ state }: { state: ScanState }) {
  if (state.phase !== 'scanning') return null;
  const pct = state.total ? Math.min(100, Math.round((state.done / state.total) * 100)) : 0;

  return (
    <motion.div
      className="progress-wrap panel"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="progress-head">
        <span className="label">{state.label}</span>
        <span className="pct">{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </motion.div>
  );
}
