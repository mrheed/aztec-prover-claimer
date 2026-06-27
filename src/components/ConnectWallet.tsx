import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { shortAddress } from '../lib/format';
import { Wallet } from './icons';

/**
 * Wallet connector: injected provider (MetaMask / Rabbit / etc.).
 * Shows a connect CTA when disconnected, an address chip + disconnect when live.
 */
export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="address-chip">
          <span style={{ color: 'var(--lime)' }}>●</span> {shortAddress(address)}
        </span>
        <button className="btn btn-ghost" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  const injected = connectors[0];
  return (
    <button
      className="btn btn-primary"
      disabled={isPending || !injected}
      onClick={() => injected && connect({ connector: injected })}
    >
      <Wallet />
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
