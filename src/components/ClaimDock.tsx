import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import type { Address } from 'viem';
import { ROLLUP_ABI } from '../contract';
import { useSettings } from '../lib/settings';
import { formatToken } from '../lib/format';
import { Bolt } from './icons';

type Props = {
  prover: Address;
  selectedEpochs: number[];
  selectedTotal: bigint;
  onClaimed: () => void;
};

/**
 * Sticky claim console. Submits claimProverRewards(prover, epochs[]) and
 * surfaces tx + receipt status. Disabled unless a wallet is connected and
 * at least one claimable epoch is selected.
 */
export function ClaimDock({ prover, selectedEpochs, selectedTotal, onClaimed }: Props) {
  const { isConnected } = useAccount();
  const { settings } = useSettings();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Notify exactly once per confirmed transaction (the hash guards against the
  // effect re-firing while isSuccess stays true across re-renders).
  const claimedHashRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isSuccess && hash && claimedHashRef.current !== hash) {
      claimedHashRef.current = hash;
      onClaimed();
    }
  }, [isSuccess, hash, onClaimed]);

  const count = selectedEpochs.length;
  const busy = isPending || confirming;

  const submit = () => {
    if (!count) return;
    reset();
    writeContract({
      address: settings.rollupAddress,
      abi: ROLLUP_ABI,
      functionName: 'claimProverRewards',
      args: [prover, selectedEpochs.map((e) => BigInt(e))],
    });
  };

  return (
    <>
      <TxToast
        hash={hash}
        confirming={confirming}
        success={isSuccess}
        error={error?.message}
        explorerUrl={settings.explorerUrl}
      />

      <AnimatePresence>
        {count > 0 && (
          <motion.div
            className="dock"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="dock-info">
              <div className="dock-stat">
                <div className="k">Selected</div>
                <div className="v">{count} epochs</div>
              </div>
              <div className="dock-stat">
                <div className="k">Total Claim</div>
                <div className="v lime">
                  {formatToken(selectedTotal, 4)} {settings.tokenSymbol}
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={submit} disabled={!isConnected || busy}>
              {busy ? (
                <>
                  <span className="spinner" />
                  {confirming ? 'Confirming…' : 'Check wallet…'}
                </>
              ) : (
                <>
                  <Bolt />
                  {isConnected ? `Claim ${count} ${count === 1 ? 'Epoch' : 'Epochs'}` : 'Connect to Claim'}
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Transient status toast for the claim transaction lifecycle. */
function TxToast({
  hash,
  confirming,
  success,
  error,
  explorerUrl,
}: {
  hash?: `0x${string}`;
  confirming: boolean;
  success: boolean;
  error?: string;
  explorerUrl: string;
}) {
  const show = Boolean(hash || error);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="tx-toast panel"
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
        >
          {error ? (
            <div className="row" style={{ color: 'var(--red)' }}>
              ✕ {error.slice(0, 120)}
            </div>
          ) : (
            <div className="row">
              {confirming ? <span className="spinner" /> : <span style={{ color: 'var(--lime)' }}>✓</span>}
              <div>
                <div style={{ color: confirming ? 'var(--fg-dim)' : 'var(--lime)' }}>
                  {confirming ? 'Claiming rewards…' : success ? 'Rewards claimed' : 'Tx submitted'}
                </div>
                {hash && explorerUrl && (
                  <a
                    href={`${explorerUrl.replace(/\/$/, '')}/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11 }}
                  >
                    {hash.slice(0, 14)}…{hash.slice(-6)}
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
