import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { crx, defineManifest } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import manifestJson from './manifest.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const manifest = defineManifest(manifestJson as any);

function collectContentEntries() {
  const dir = resolve(__dirname, 'src', 'content');
  if (!fs.existsSync(dir)) return {};
  
  const files = fs.readdirSync(dir);
  const entries: Record<string, string> = {};
  
  for (const file of files) {
    const full = resolve(dir, file);
    const stat = fs.statSync(full);
    
    if (!stat.isFile()) continue;
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
    
    const base = file.replace(/\.(ts|js)$/, '');
    entries[`content_${base}`] = full;
  }
  
  return entries;
}

export default defineConfig({
  plugins: [tailwindcss(), crx({ manifest })],
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: Object.assign(
        {
          popup: resolve(__dirname, 'src/popup/popup.html'),
          background: resolve(__dirname, 'src/background/service-worker.ts'),
        },
        collectContentEntries()
      ),
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name || '';
          if (name === 'popup') return 'src/popup/popup.js';
          if (name.startsWith('content_')) return `content/${name.replace('content_', '')}.js`;
          return '[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});