import { PORT_NAMES, ScrapingUpdate, PortMessage, Site, KeywordStatus, Product } from '../types';
import { PortManager } from '../utils/messaging';
import { StorageManager } from '../utils/storage-manager';

chrome.runtime.onInstalled.addListener(() => {
  console.log('PrecioScout Service Worker Initialized');
});

const orchestrator = new PortManager();

// URLs de búsqueda por sitio
const SEARCH_URLS: Record<Site, (keyword: string, page?: number) => string> = {
  Falabella: (kw, page = 1) => {
    const base = `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodeURIComponent(kw)}`;
    if (page === 1) return base;
    return `${base}&page=${page}`;
  },
  MercadoLibre: (kw, page = 1) => {
    const base = `https://listado.mercadolibre.com.pe/${encodeURIComponent(kw.replace(/ /g, '-'))}`;
    if (page === 1) return base;
    const offset = (page - 1) * 48 + 1;
    return `${base}_Desde_${offset}_NoIndex_True`;
  }
};

const CONTENT_SCRIPTS: Record<Site, string> = {
  Falabella: 'content/falabella.js',
  MercadoLibre: 'content/meli.js'
};

// Estado de scraping activo - genérico para ambos sitios
interface ScrapingState {
  keywordId: string;
  keywordText: string;
  site: Site;
  currentPage: number;
  maxPages: number;
  maxProducts: number;
  allProducts: Product[];
  isActive: boolean;
}

// Mapa de estados de scraping por keywordId+site
const scrapingStates: Map<string, ScrapingState> = new Map();

// Helper to create state key
const getStateKey = (keywordId: string, site: Site) => `${keywordId}:${site}`;

// Cola para mensajes
interface QueuedMessage {
  keywordId: string;
  products: Product[];
}

let messageQueue: QueuedMessage[] = [];
let isProcessingQueue = false;

async function processQueue(): Promise<void> {
  if (isProcessingQueue || messageQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift()!;
    console.log(`[Queue] Procesando: ${msg.keywordId}, ${msg.products.length} productos`);
    
    try {
      await StorageManager.saveProducts(msg.keywordId, msg.products);
      console.log(`[Queue] Guardado OK: ${msg.keywordId}`);
    } catch (error) {
      console.error(`[Queue] Error guardando:`, error);
    }
  }
  
  isProcessingQueue = false;
}

function enqueueMessage(keywordId: string, products: Product[]): void {
  messageQueue.push({ keywordId, products });
  processQueue();
}

/**
 * Abre una página y ejecuta el scraping
 */
async function scrapePageForSite(
  site: Site,
  keywordId: string,
  keywordText: string,
  page: number,
  maxProducts?: number
): Promise<void> {
  const url = SEARCH_URLS[site](keywordText, page);
  
  console.log(`[Background] Abriendo ${site} página ${page}: ${url} (max: ${maxProducts || 'default'})`);
  
  const tab = await chrome.tabs.create({ url, active: false });
  
  // Esperar a que la página cargue
  await new Promise<void>((resolve) => {
    const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    
    // Timeout de seguridad
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log(`[Background] Inyectando script en ${site} tab ${tab.id}`);
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: [CONTENT_SCRIPTS[site]]
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await chrome.tabs.sendMessage(tab.id!, {
      action: 'START_SCRAPING',
      keywordId,
      keywordText,
      site,
      tabId: tab.id,
      page,
      maxProducts
    });
    
    console.log(`[Background] START_SCRAPING enviado a ${site} página ${page}`);
  } catch (error) {
    console.error(`[Background] Error en página ${page}:`, error);
    // Si hay error, finalizar
    const stateKey = getStateKey(keywordId, site);
    const state = scrapingStates.get(stateKey);
    if (state) {
      await finalizeMultiPageScraping(keywordId, site);
    }
  }
}

/**
 * Inicia scraping multi-página genérico para cualquier sitio
 */
async function startMultiPageScraping(
  site: Site,
  keywordId: string, 
  keywordText: string,
  maxProducts: number,
  maxPages: number
): Promise<void> {
  const stateKey = getStateKey(keywordId, site);
  console.log(`[Background] Iniciando ${site} multi-page para: ${keywordId} (max: ${maxProducts}, pages: ${maxPages})`);
  
  scrapingStates.set(stateKey, {
    keywordId,
    keywordText,
    site,
    currentPage: 1,
    maxPages,
    maxProducts,
    allProducts: [],
    isActive: true
  });
  
  await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
  await scrapePageForSite(site, keywordId, keywordText, 1, maxProducts);
}

/**
 * Continuar con la siguiente página
 */
async function continueScrapingNextPage(keywordId: string, site: Site): Promise<void> {
  const stateKey = getStateKey(keywordId, site);
  const state = scrapingStates.get(stateKey);
  if (!state || !state.isActive) {
    console.log(`[Background] Estado no encontrado o inactivo para: ${stateKey}`);
    return;
  }
  
  if (state.currentPage >= state.maxPages) {
    console.log(`[Background] Máximo de páginas alcanzado (${state.maxPages})`);
    await finalizeMultiPageScraping(keywordId, site);
    return;
  }
  
  if (state.allProducts.length >= state.maxProducts) {
    console.log(`[Background] Suficientes productos (${state.allProducts.length}/${state.maxProducts})`);
    await finalizeMultiPageScraping(keywordId, site);
    return;
  }
  
  state.currentPage++;
  console.log(`[Background] Continuando ${site} a página ${state.currentPage}`);
  
  await scrapePageForSite(state.site, state.keywordId, state.keywordText, state.currentPage, state.maxProducts);
}

/**
 * Finaliza el scraping multi-página - ASYNC para garantizar orden correcto
 */
async function finalizeMultiPageScraping(keywordId: string, site: Site): Promise<void> {
  const stateKey = getStateKey(keywordId, site);
  const state = scrapingStates.get(stateKey);
  if (!state) {
    console.log(`[Background] Finalize: estado no encontrado para ${stateKey}`);
    return;
  }
  
  console.log(`[Background] === FINALIZANDO ${site} ${keywordId}: ${state.allProducts.length} productos ===`);
  
  state.isActive = false;
  
  // Truncar productos al límite solicitado
  const productsToSave = state.allProducts.slice(0, state.maxProducts);
  
  // PASO 1: Guardar productos primero
  if (productsToSave.length > 0) {
    console.log(`[Background] Guardando ${productsToSave.length} productos (de ${state.allProducts.length} recolectados)...`);
    await StorageManager.saveProducts(state.keywordId, productsToSave);
    console.log(`[Background] Productos guardados OK`);
  }
  
  // PASO 2: Actualizar estado a DONE
  console.log(`[Background] Actualizando estado a DONE...`);
  await StorageManager.updateKeywordStatus(state.keywordId, KeywordStatus.DONE);
  console.log(`[Background] Estado actualizado a DONE`);
  
  // PASO 3: Notificar al popup
  try {
    orchestrator.postMessage('SCRAPING_DONE', {
      keywordId: state.keywordId,
      products: state.allProducts
    });
  } catch (e) {
    console.log('[Background] No se pudo notificar al popup (puede estar cerrado)');
  }
  
  // Limpiar estado
  scrapingStates.delete(stateKey);
  
  console.log(`[Background] === SCRAPING COMPLETADO EXITOSAMENTE ===`);
}

// Orquestador central
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAMES.SEARCH) return;

  console.log('Background: Nueva conexión establecida:', port.name);
  orchestrator.setPort(port);

  orchestrator.onMessage(async (message: PortMessage) => {
    console.log('Background: Mensaje recibido:', message.type);

    if (message.type === 'START_SCRAPING' && message.payload.site && message.payload.keywordText) {
      const { keywordId, keywordText, site, maxProducts, maxPages } = message.payload;
      
      // Usar scraping multi-página para ambos sitios
      const defaultMax = site === 'MercadoLibre' ? 100 : 60;
      const defaultPages = site === 'MercadoLibre' ? 3 : 3;
      await startMultiPageScraping(site, keywordId, keywordText, maxProducts || defaultMax, maxPages || defaultPages);
    }

    if (message.type === 'START_BOTH_SCRAPING' && message.payload.keywordText) {
      const { keywordId, keywordText } = message.payload;
      
      await startMultiPageScraping('Falabella', keywordId, keywordText, 60, 3);
      await startMultiPageScraping('MercadoLibre', keywordId, keywordText, 100, 3);
    }

    if (message.type === 'CANCEL_SCRAPING') {
      const { keywordId } = message.payload;
      
      // Cancelar ambos sitios si existen
      for (const site of ['Falabella', 'MercadoLibre'] as Site[]) {
        const stateKey = getStateKey(keywordId, site);
        const state = scrapingStates.get(stateKey);
        if (state) {
          state.isActive = false;
          scrapingStates.delete(stateKey);
        }
      }
      
      await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
    }
  });

  orchestrator.onDisconnect(() => {
    console.log('Background: Conexión cerrada');
  });
});

/**
 * Maneja mensajes de los content scripts
 */
chrome.runtime.onMessage.addListener((message: ScrapingUpdate, sender) => {
  console.log('Background: Content script:', message.action, 'productos:', message.products?.length, 'site:', message.site);

  if (message.action === 'SCRAPING_PROGRESS') {
    StorageManager.updateProductCount(message.keywordId!, message.products?.length || 0);
    try {
      orchestrator.postMessage('SCRAPING_PROGRESS', message);
    } catch (e) { /* popup puede estar cerrado */ }
  }

  if (message.action === 'SCRAPING_DONE') {
    const products = message.products || [];
    const keywordId = message.keywordId!;
    const site = message.site!;
    const stateKey = getStateKey(keywordId, site);
    
    console.log(`[Background] SCRAPING_DONE: ${products.length} productos de ${site} keywordId: ${keywordId}`);
    
    // Cerrar tab
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {});
    }
    
    // Buscar estado para este site
    const state = scrapingStates.get(stateKey);
    
    if (state && state.isActive) {
      // Es scraping multi-página
      state.allProducts.push(...products);
      console.log(`[Background] ${site} acumulado: ${state.allProducts.length} productos`);
      
      // Determinar límite de productos por página según sitio
      const productsPerPage = site === 'MercadoLibre' ? 48 : 40;
      
      // Si devolvió menos del esperado o alcanzamos el máximo, es la última página
      if (products.length < productsPerPage || state.allProducts.length >= state.maxProducts) {
        console.log(`[Background] Última página de ${site} (${products.length} productos)`);
        (async () => {
          await finalizeMultiPageScraping(keywordId, site);
        })();
      } else {
        // Continuar con siguiente página
        continueScrapingNextPage(keywordId, site);
      }
    } else {
      // Estado no encontrado - guardar directamente
      console.log(`[Background] ${site}: no hay estado multi-page, guardando directamente`);
      
      (async () => {
        if (products.length > 0) {
          await StorageManager.saveProducts(keywordId, products);
        }
        await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.DONE);
        
        try {
          orchestrator.postMessage('SCRAPING_DONE', message);
        } catch (e) { /* popup puede estar cerrado */ }
      })();
    }
  }

  if (message.action === 'SCRAPING_ERROR') {
    const keywordId = message.keywordId!;
    const site = message.site || 'Falabella';
    const stateKey = getStateKey(keywordId, site);
    
    // Si teníamos estado multi-página, finalizar con lo que tengamos
    const state = scrapingStates.get(stateKey);
    if (state && state.allProducts.length > 0) {
      (async () => {
        await finalizeMultiPageScraping(keywordId, site);
      })();
    } else {
      StorageManager.updateKeywordStatus(keywordId, KeywordStatus.ERROR);
      try {
        orchestrator.postMessage('SCRAPING_ERROR', message);
      } catch (e) { /* popup puede estar cerrado */ }
    }
  }
  
  return true;
});

