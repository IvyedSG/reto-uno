import { defineConfig, build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'build-extension',
      apply: 'build',
      async closeBundle() {
        // Copy manifest.json to dist
        const manifestSrc = resolve(__dirname, 'manifest.json');
        const manifestDist = resolve(__dirname, 'dist/manifest.json');
        fs.copyFileSync(manifestSrc, manifestDist);
        console.log('Copied manifest.json to dist');
        
        // Move popup files from src/popup to popup
        const srcPopup = resolve(__dirname, 'dist/src/popup');
        const dstPopup = resolve(__dirname, 'dist/popup');
        
        if (fs.existsSync(srcPopup)) {
          // Ensure popup dir exists
          if (!fs.existsSync(dstPopup)) {
            fs.mkdirSync(dstPopup, { recursive: true });
          }
          
          const files = fs.readdirSync(srcPopup);
          for (const file of files) {
            const src = resolve(srcPopup, file);
            const dst = resolve(dstPopup, file);
            fs.copyFileSync(src, dst);
          }
          
          // Fix HTML paths (remove leading /)
          const htmlPath = resolve(dstPopup, 'popup.html');
          if (fs.existsSync(htmlPath)) {
            let html = fs.readFileSync(htmlPath, 'utf-8');
            // Fix paths to be relative from popup/ folder
            html = html.replace(/src="\/popup\//g, 'src="./');
            html = html.replace(/href="\/assets\//g, 'href="../assets/');
            html = html.replace(/src="\/assets\//g, 'src="../assets/');
            fs.writeFileSync(htmlPath, html);
            console.log('Fixed popup.html asset paths');
          }
          
          // Remove src folder
          fs.rmSync(resolve(__dirname, 'dist/src'), { recursive: true });
          console.log('Cleaned up dist/src folder');
        }
        
        // Build content scripts as IIFE bundles
        const contentScripts = ['falabella', 'meli'];
        
        for (const script of contentScripts) {
          const inputPath = resolve(__dirname, `src/content/${script}.ts`);
          
          if (!fs.existsSync(inputPath)) continue;
          
          console.log(`Building content script: ${script}`);
          
          await build({
            configFile: false,
            build: {
              emptyOutDir: false,
              outDir: 'dist/content',
              lib: {
                entry: inputPath,
                name: script,
                formats: ['iife'],
                fileName: () => `${script}.js`
              },
              rollupOptions: {
                output: {
                  extend: true,
                  inlineDynamicImports: true
                }
              },
              minify: true,
              sourcemap: false
            },
            logLevel: 'warn'
          });
        }
        
        console.log('All content scripts built as IIFE bundles');
      }
    }
  ],
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
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name || '';
          if (name === 'background') return 'background.js';
          return '[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});