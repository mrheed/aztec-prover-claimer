import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SettingsContext,
  buildWagmiConfig,
  configSignature,
  loadSettings,
  saveSettings,
  type AppSettings,
} from './lib/settings';
import { App } from './App';
import './styles.css';

const queryClient = new QueryClient();

/**
 * Root provider tree. Holds editable settings, derives the wagmi config from
 * them, and remounts WagmiProvider whenever the chain/RPC change so the new
 * transport + connectors take effect cleanly.
 */
function Root() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const update = (next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
  };

  const wagmiConfig = useMemo(() => buildWagmiConfig(settings), [settings]);
  const sig = configSignature(settings);

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      <WagmiProvider config={wagmiConfig} key={sig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </SettingsContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
