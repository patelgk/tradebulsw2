import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
    return {
      plugins: [react(), tailwindcss()],
      cacheDir: path.join(os.tmpdir(), 'tradebulsw2-1-vite-cache'),
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DHAN_CLIENT_ID': JSON.stringify(env.DHAN_CLIENT_ID),
      'process.env.DHAN_ACCESS_TOKEN': JSON.stringify(env.DHAN_ACCESS_TOKEN),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path,
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'dexie-react-hooks'],
            charts: ['lightweight-charts'],
            motion: ['motion'],
            realtime: ['socket.io-client'],
            icons: ['lucide-react'],
            storage: ['dexie'],
          },
        },
      },
    },
  };
});
