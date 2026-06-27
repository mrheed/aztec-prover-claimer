import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { isAddress } from 'viem';
import { DEFAULT_SETTINGS, useSettings, type AppSettings } from '../lib/settings';

/** Slide-over panel for editing connection settings at runtime. */
export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);

  // Re-seed the draft from live settings each time the panel opens.
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const rollupOk = isAddress(draft.rollupAddress);
  const proverOk = isAddress(draft.defaultProver);
  const chainOk = Number.isInteger(draft.chainId) && draft.chainId > 0;
  const rpcOk = /^https?:\/\//.test(draft.rpcUrl);
  const valid = rollupOk && proverOk && chainOk && rpcOk;

  const apply = () => {
    if (!valid) return;
    update(draft);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer panel"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="drawer-head">
              <h2>Connection</h2>
              <button className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>

            <div className="drawer-body">
              <Row label="Chain Name">
                <input value={draft.chainName} onChange={(e) => set('chainName', e.target.value)} />
              </Row>
              <Row label="Chain ID" bad={!chainOk}>
                <input
                  value={String(draft.chainId)}
                  onChange={(e) => set('chainId', Number(e.target.value.replace(/\D/g, '')) || 0)}
                  placeholder="1"
                />
              </Row>
              <Row label="RPC URL" bad={!rpcOk}>
                <input
                  value={draft.rpcUrl}
                  onChange={(e) => set('rpcUrl', e.target.value.trim())}
                  placeholder="https://… or http://host:port"
                  spellCheck={false}
                />
              </Row>
              <Row label="Explorer URL (optional)">
                <input
                  value={draft.explorerUrl}
                  onChange={(e) => set('explorerUrl', e.target.value.trim())}
                  placeholder="https://etherscan.io"
                  spellCheck={false}
                />
              </Row>
              <Row label="Rollup Address" bad={!rollupOk}>
                <input
                  value={draft.rollupAddress}
                  onChange={(e) => set('rollupAddress', e.target.value.trim() as AppSettings['rollupAddress'])}
                  placeholder="0x…"
                  spellCheck={false}
                />
              </Row>
              <Row label="Default Prover" bad={!proverOk}>
                <input
                  value={draft.defaultProver}
                  onChange={(e) => set('defaultProver', e.target.value.trim() as AppSettings['defaultProver'])}
                  placeholder="0x…"
                  spellCheck={false}
                />
              </Row>
              <Row label="Token Symbol">
                <input value={draft.tokenSymbol} onChange={(e) => set('tokenSymbol', e.target.value)} />
              </Row>
            </div>

            <div className="drawer-foot">
              <button className="btn btn-ghost" onClick={() => setDraft(DEFAULT_SETTINGS)}>
                Reset defaults
              </button>
              <button className="btn btn-primary" onClick={apply} disabled={!valid}>
                Apply &amp; Reload
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** One labelled field row, with an error tint when invalid. */
function Row({ label, bad, children }: { label: string; bad?: boolean; children: React.ReactNode }) {
  return (
    <div className={`field drawer-field ${bad ? 'bad' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
