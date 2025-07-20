import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      configPath: '../wrangler.toml',
      d1Databases: {
        DB: 'c174aee0-da86-4d6d-a398-bba3caaebf45',
      },
    }),
  ],
  // SPA source directory
  root: './spa',
  // Build configuration
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  // Development server configuration
  server: {
    port: 5173,
    host: true,
  },
  // Preview server configuration
  preview: {
    port: 4173,
  },
});
