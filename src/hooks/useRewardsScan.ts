import { useCallback, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import { ROLLUP_ABI } from '../contract';
import { useSettings } from '../lib/settings';
import { buildEpochRange, mapWithConcurrency, type EpochRow } from '../lib/scan';
import {
  historyKey,
  loadRecord,
  saveRecord,
  serializeRows,
  deserializeRows,
  mergeRows,
  clearRecord,
} from '../lib/history';
import { claimsKey, loadClaims, addClaims, applyClaims, entriesFromRows } from '../lib/claims';

export type ScanState =
  | { phase: 'idle' }
  | { phase: 'scanning'; done: number; total: number; label: string }
  | { phase: 'done'; total: number }
  | { phase: 'error'; message: string };

/** Metadata about the currently-displayed ledger (from a scan or restored cache). */
export type ScanMeta = { updatedAt: number; start: number; end: number; restored: boolean };

const CONCURRENCY = 16; // matches rewards.js — many cheap eth_calls, no Multicall3
const RETRY = 3;
const RETRY_DELAY_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scans an epoch range for a prover's rewards + claim status using individual
 * per-epoch eth_calls at bounded concurrency — the same strategy as
 * prover-rewards.sh / rewards.js. No Multicall3 dependency, so it works on any
 * chain (including a private Aztec L1 node). Streams progress for the loading bar.
 */
export function useRewardsScan() {
  const client = usePublicClient();
  const { settings } = useSettings();
  const rollup = settings.rollupAddress;
  const chainId = settings.chainId;
  const [state, setState] = useState<ScanState>({ phase: 'idle' });
  const [rows, setRows] = useState<EpochRow[]>([]);
  const [meta, setMeta] = useState<ScanMeta | null>(null);
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // Restore a previously-saved ledger for a prover (no network). Claimed rewards
  // come back even without a scan record — the claims ledger is permanent.
  const restore = useCallback(
    (prover: Address): boolean => {
      const claims = loadClaims(claimsKey(chainId, rollup, prover));
      const rec = loadRecord(historyKey(chainId, rollup, prover));
      if (!rec && claims.length === 0) {
        setRows([]);
        setMeta(null);
        setState({ phase: 'idle' });
        return false;
      }
      const restored = applyClaims(rec ? deserializeRows(rec.rows) : [], claims);
      setRows(restored);
      setMeta({
        updatedAt: rec?.updatedAt ?? Math.max(...claims.map((e) => e.claimedAt)),
        start: rec?.start ?? 0,
        end: rec?.end ?? 0,
        restored: true,
      });
      setState({ phase: 'done', total: restored.length });
      return true;
    },
    [chainId, rollup],
  );

  // Forget the saved scan ledger for a prover. Claimed rewards are permanent
  // and survive the clear — only unclaimed scan rows are forgotten.
  const clearHistory = useCallback(
    (prover: Address) => {
      clearRecord(historyKey(chainId, rollup, prover));
      const claims = loadClaims(claimsKey(chainId, rollup, prover));
      const kept = applyClaims([], claims);
      setRows(kept);
      setMeta(null);
      setState(kept.length > 0 ? { phase: 'done', total: kept.length } : { phase: 'idle' });
    },
    [chainId, rollup],
  );

  // Persist claimed status for specific epochs after a confirmed claim — without
  // a re-scan, and regardless of whether they fall in the last scanned range.
  // Also records each claim in the permanent claims ledger (never deleted).
  const markClaimed = useCallback(
    (prover: Address, epochs: number[], txHash?: string) => {
      if (epochs.length === 0) return;
      const key = historyKey(chainId, rollup, prover);
      const rec = loadRecord(key);
      const claimedSet = new Set(epochs);

      setRows((current) => {
        const base = rec ? deserializeRows(rec.rows) : current;
        const updated = base.map((r) => (claimedSet.has(r.epoch) ? { ...r, claimed: true } : r));
        const updatedAt = Date.now();
        addClaims(
          claimsKey(chainId, rollup, prover),
          { chainId, rollup, prover },
          entriesFromRows(updated.filter((r) => claimedSet.has(r.epoch)), updatedAt, txHash),
        );
        saveRecord(key, {
          chainId,
          rollup,
          prover,
          start: rec?.start ?? 0,
          end: rec?.end ?? 0,
          updatedAt,
          rows: serializeRows(updated),
        });
        setMeta((m) => ({
          updatedAt,
          start: rec?.start ?? m?.start ?? 0,
          end: rec?.end ?? m?.end ?? 0,
          restored: false,
        }));
        return updated;
      });
    },
    [chainId, rollup],
  );

  const scan = useCallback(
    async (prover: Address, start: number, end: number) => {
      if (!client) {
        setState({ phase: 'error', message: 'RPC client unavailable' });
        return;
      }
      cancelRef.current = false;
      setRows([]);

      const epochs = buildEpochRange(start, end);
      if (epochs.length === 0) {
        setState({ phase: 'error', message: 'Invalid epoch range' });
        return;
      }

      // One read with bounded retry; returns null on persistent failure / cancel.
      const readWithRetry = async <T,>(
        functionName: 'getSpecificProverRewardsForEpoch' | 'getHasClaimed',
        args: readonly unknown[],
      ): Promise<T | null> => {
        for (let attempt = 1; attempt <= RETRY; attempt++) {
          if (cancelRef.current) return null;
          try {
            return (await client.readContract({
              address: rollup,
              abi: ROLLUP_ABI,
              functionName,
              args: args as never,
            })) as T;
          } catch {
            if (attempt < RETRY) await sleep(RETRY_DELAY_MS);
          }
        }
        return null;
      };

      setState({ phase: 'scanning', done: 0, total: 100, label: 'Reading epoch rewards…' });

      try {
        // Pass 1 — reward per epoch (70% of the bar).
        const rewardResults = await mapWithConcurrency(
          epochs,
          CONCURRENCY,
          (epoch) =>
            readWithRetry<bigint>('getSpecificProverRewardsForEpoch', [BigInt(epoch), prover]),
          (done) => {
            setState({
              phase: 'scanning',
              done: Math.round((done / epochs.length) * 70),
              total: 100,
              label: `Reading rewards — ${done}/${epochs.length} epochs`,
            });
          },
        );
        if (cancelRef.current) return setState({ phase: 'idle' });

        const rewardByEpoch = new Map<number, bigint>();
        epochs.forEach((epoch, i) => rewardByEpoch.set(epoch, rewardResults[i] ?? 0n));

        // Pass 2 — claim status, only for epochs that actually paid out (30%).
        const hits = epochs.filter((e) => (rewardByEpoch.get(e) ?? 0n) > 0n);
        const claimedByEpoch = new Map<number, boolean>();

        if (hits.length > 0) {
          const claimResults = await mapWithConcurrency(
            hits,
            CONCURRENCY,
            (epoch) => readWithRetry<boolean>('getHasClaimed', [prover, BigInt(epoch)]),
            (done) => {
              setState({
                phase: 'scanning',
                done: 70 + Math.round((done / hits.length) * 30),
                total: 100,
                label: `Checking claim status — ${done}/${hits.length}`,
              });
            },
          );
          if (cancelRef.current) return setState({ phase: 'idle' });
          hits.forEach((epoch, i) => claimedByEpoch.set(epoch, Boolean(claimResults[i])));
        }

        // Keep only epochs that produced a reward — that's what matters for claiming.
        const scanned: EpochRow[] = epochs
          .map((epoch) => ({
            epoch,
            reward: rewardByEpoch.get(epoch) ?? 0n,
            claimed: claimedByEpoch.get(epoch) ?? false,
          }))
          .filter((r) => r.reward > 0n);

        // Merge over any saved ledger so scans of different ranges accumulate,
        // then persist the combined history.
        const key = historyKey(chainId, rollup, prover);
        const cached = loadRecord(key);
        const updatedAt = Date.now();

        // Harvest on-chain claimed epochs into the permanent claims ledger, then
        // overlay the ledger — a claimed epoch never flips back or disappears,
        // even if this scan's getHasClaimed read failed.
        const claims = addClaims(
          claimsKey(chainId, rollup, prover),
          { chainId, rollup, prover },
          entriesFromRows(scanned, updatedAt),
        );
        const merged = applyClaims(
          mergeRows(cached ? deserializeRows(cached.rows) : [], scanned, start, end),
          claims,
        );
        saveRecord(key, {
          chainId,
          rollup,
          prover,
          start,
          end,
          updatedAt,
          rows: serializeRows(merged),
        });

        setRows(merged);
        setMeta({ updatedAt, start, end, restored: false });
        setState({ phase: 'done', total: merged.length });
      } catch (err) {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Scan failed',
        });
      }
    },
    [client, rollup, chainId],
  );

  return { state, rows, meta, scan, restore, clearHistory, markClaimed, cancel };
}
