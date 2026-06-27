import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the Aztec Prover Console dashboard.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
});
