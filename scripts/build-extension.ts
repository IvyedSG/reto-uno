import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const alias = {
  '@': resolve(rootDir, 'src'),
};

async function buildExtension() {
  console.log('🚀 Iniciando post-procesamiento de la extensión...');

  const manifestSrc = resolve(rootDir, 'public/manifest.json');
  const manifestDist = resolve(rootDir, 'dist/manifest.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDist);
    console.log('✅ manifest.json copiado.');
  }

  const rulesSrc = resolve(rootDir, 'public/rules.json');
  const rulesDist = resolve(rootDir, 'dist/rules.json');
  if (fs.existsSync(rulesSrc)) {
    fs.copyFileSync(rulesSrc, rulesDist);
    console.log('✅ rules.json copiado.');
  }

  const srcPopup = resolve(rootDir, 'dist/src/popup');
  const dstPopup = resolve(rootDir, 'dist/popup');
  
  if (fs.existsSync(srcPopup)) {
    if (!fs.existsSync(dstPopup)) {
      fs.mkdirSync(dstPopup, { recursive: true });
    }
    
    const files = fs.readdirSync(srcPopup);
    for (const file of files) {
      fs.copyFileSync(resolve(srcPopup, file), resolve(dstPopup, file));
    }
    
    const htmlPath = resolve(dstPopup, 'popup.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf-8');
      html = html.replace(/src="\/popup\//g, 'src="./');
      html = html.replace(/href="\/assets\//g, 'href="../assets/');
      html = html.replace(/src="\/assets\//g, 'src="../assets/');
      fs.writeFileSync(htmlPath, html);
      console.log('✅ popup.html corregido.');
    }
    
    fs.rmSync(resolve(rootDir, 'dist/src'), { recursive: true });
    console.log('🗑️ Carpeta dist/src eliminada.');
  }

  const contentScripts = ['falabella', 'meli'];
  
  for (const script of contentScripts) {
    const inputPath = resolve(rootDir, `src/content/${script}.ts`);
    if (!fs.existsSync(inputPath)) continue;
    
    console.log(`📦 Compilando content script: ${script}...`);
    
    await build({
      configFile: false,
      resolve: { alias },
      build: {
        emptyOutDir: false,
        outDir: resolve(rootDir, 'dist/content'),
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
  
  console.log('✨ Build de extensión completado con éxito.');
}

buildExtension().catch(err => {
  console.error('❌ Error durante el build:', err);
  process.exit(1);
});
