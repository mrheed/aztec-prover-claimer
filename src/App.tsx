import { useEffect, useMemo, useState } from 'react';
import { isAddress, type Address } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { ROLLUP_ABI } from './contract';
import { useSettings } from './lib/settings';
import { useRewardsScan } from './hooks/useRewardsScan';
import { useTokenPrice } from './hooks/useTokenPrice';
import { totalClaimable, totalClaimed, claimableEpochs } from './lib/scan';
import { shortAddress } from './lib/format';
import { ConnectWallet } from './components/ConnectWallet';
import { StatCards } from './components/StatCards';
import { ScanProgress } from './components/ScanProgress';
import { RewardsTable } from './components/RewardsTable';
import { ClaimDock } from './components/ClaimDock';
import { SettingsPanel } from './components/SettingsPanel';
import { PriceTicker } from './components/PriceTicker';
import { LogoMark, Search, Gear } from './components/icons';

export function App() {
  const { address } = useAccount();
  const { settings } = useSettings();
  const { state, rows, meta, scan, restore, clearHistory, markClaimed } = useRewardsScan();
  const { data: price } = useTokenPrice();

  const [proverInput, setProverInput] = useState<string>(settings.defaultProver);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scanned, setScanned] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const proverValid = isAddress(proverInput);
  const prover = (proverValid ? proverInput : settings.defaultProver) as Address;

  // Live rollup head — used for defaults + the stat readout.
  const { data: currentEpoch } = useReadContract({
    address: settings.rollupAddress,
    abi: ROLLUP_ABI,
    functionName: 'getCurrentEpoch',
  });

  // Prover's current reward shares (multiplier).
  const { data: shares } = useReadContract({
    address: settings.rollupAddress,
    abi: ROLLUP_ABI,
    functionName: 'getSharesFor',
    args: [prover],
    query: { enabled: proverValid },
  });

  // Seed the epoch range from the rollup head once it loads.
  useEffect(() => {
    if (currentEpoch != null && start === '' && end === '') {
      const head = Number(currentEpoch);
      setStart(String(Math.max(0, head - 100)));
      setEnd(String(Math.max(0, head - 1)));
    }
  }, [currentEpoch, start, end]);

  const claimable = useMemo(() => totalClaimable(rows), [rows]);
  const claimed = useMemo(() => totalClaimed(rows), [rows]);
  const claimableCount = useMemo(() => claimableEpochs(rows).length, [rows]);

  const selectedEpochs = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const selectedTotal = useMemo(
    () => rows.filter((r) => selected.has(r.epoch)).reduce((a, r) => a + r.reward, 0n),
    [rows, selected],
  );

  const runScan = () => {
    setSelected(new Set());
    setScanned(true);
    scan(prover, Number(start), Number(end));
  };

  // Auto-select every claimable epoch once a scan completes (mirrors the shell script).
  useEffect(() => {
    if (state.phase === 'done') setSelected(new Set(claimableEpochs(rows)));
  }, [state.phase, rows]);

  // Restore saved history when the prover / chain / rollup changes (no network),
  // unless a scan is currently in flight.
  useEffect(() => {
    if (!proverValid || state.phase === 'scanning') return;
    restore(prover);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prover, proverValid, settings.chainId, settings.rollupAddress, restore]);

  const toggle = (epoch: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(epoch) ? next.delete(epoch) : next.add(epoch);
      return next;
    });

  const toggleAll = () => {
    const all = claimableEpochs(rows);
    setSelected((prev) => (all.every((e) => prev.has(e)) ? new Set() : new Set(all)));
  };

  const scanning = state.phase === 'scanning';

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <LogoMark />
          </div>
          <div className="brand-text">
            <h1>Aztec Prover Console</h1>
            <span>rollup {shortAddress(settings.rollupAddress)} · {settings.chainName}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PriceTicker />
          <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)} title="Connection settings">
            <Gear /> Settings
          </button>
          <ConnectWallet />
        </div>
      </header>

      <StatCards
        currentEpoch={currentEpoch as bigint | undefined}
        shares={shares as bigint | undefined}
        claimableTotal={claimable}
        claimableCount={claimableCount}
        claimedTotal={claimed}
        price={price?.currentPrice}
      />

      {!proverValid && (
        <div className="banner warn">⚠ Enter a valid prover address to scan rewards.</div>
      )}
      {state.phase === 'error' && <div className="banner err">✕ {state.message}</div>}

      <div className="controls panel">
        <div className="field">
          <label>Prover Address</label>
          <input
            value={proverInput}
            onChange={(e) => setProverInput(e.target.value.trim())}
            placeholder="0x…"
            spellCheck={false}
          />
        </div>
        <div className="field">
          <label>Start Epoch</label>
          <input value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))} placeholder="0" />
        </div>
        <div className="field">
          <label>End Epoch</label>
          <input value={end} onChange={(e) => setEnd(e.target.value.replace(/\D/g, ''))} placeholder="0" />
        </div>
        <button className="btn btn-primary" onClick={runScan} disabled={scanning || !proverValid || !start || !end}>
          <Search className="" />
          {scanning ? 'Scanning…' : 'Scan Rewards'}
        </button>
      </div>

      <ScanProgress state={state} />

      <RewardsTable
        rows={rows}
        selected={selected}
        scanned={scanned && state.phase !== 'scanning'}
        meta={meta}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onClear={() => clearHistory(prover)}
      />

      <div className="footer-note">
        <span>RPC</span> {settings.rpcUrl}
        <span>·</span>
        <span>Claimer</span> {address ? shortAddress(address) : 'not connected'}
        <span>·</span>
        <span>Method</span> claimProverRewards(address, uint256[])
      </div>

      <ClaimDock
        prover={prover}
        selectedEpochs={selectedEpochs}
        selectedTotal={selectedTotal}
        onClaimed={() => {
          // Persist claimed status for exactly the epochs just claimed, then clear selection.
          markClaimed(prover, selectedEpochs);
          setSelected(new Set());
        }}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
