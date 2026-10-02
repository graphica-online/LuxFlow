import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],

  build: {
    // Отключаем минификацию имён в dev для отладки
    minify: 'esbuild',
    // Sourcemap для отладки content script и worker
    sourcemap: 'inline',
    // Целевая версия для MV3 (Chrome 88+)
    target: 'chrome100',
  },

  server: {
    // CRXJS требует фиксированный порт для HMR
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },

  // Для CommonJS-зависимостей (suncalc)
  optimizeDeps: {
    include: ['suncalc'],
  },
});