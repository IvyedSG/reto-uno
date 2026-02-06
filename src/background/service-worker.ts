import { PORT_NAMES, ScrapingUpdate, PortMessage, Site, KeywordStatus, Product } from '../types';
import { PortManager } from '../utils/messaging';
import { StorageManager } from '../utils/storage-manager';

chrome.runtime.onInstalled.addListener(() => {
  console.log('PrecioScout Service Worker Initialized');
});

const orchestrator = new PortManager();

// URLs de búsqueda por sitio
const SEARCH_URLS: Record<Site, (keyword: string, page?: number) => string> = {
  Falabella: (kw) => `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodeURIComponent(kw)}`,
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

// Estado de scraping activo - mapeado por keywordId para MercadoLibre
interface ScrapingState {
  keywordId: string;
  keywordText: string;
  site: Site;
  currentPage: number;
  maxPages: number;
  allProducts: Product[];
  isActive: boolean;
}

// Usar keywordId como key principal (más robusto)
const meliScrapingStates: Map<string, ScrapingState> = new Map();

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
  page: number
): Promise<void> {
  const url = SEARCH_URLS[site](keywordText, page);
  
  console.log(`[Background] Abriendo ${site} página ${page}: ${url}`);
  
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
      page
    });
    
    console.log(`[Background] START_SCRAPING enviado a ${site} página ${page}`);
  } catch (error) {
    console.error(`[Background] Error en página ${page}:`, error);
    // Si hay error, finalizar
    const state = meliScrapingStates.get(keywordId);
    if (state) {
      await finalizeMultiPageScraping(keywordId);
    }
  }
}

/**
 * Inicia scraping multi-página para MercadoLibre
 */
async function startMeliMultiPageScraping(keywordId: string, keywordText: string): Promise<void> {
  console.log(`[Background] Iniciando ML multi-page para: ${keywordId}`);
  
  meliScrapingStates.set(keywordId, {
    keywordId,
    keywordText,
    site: 'MercadoLibre',
    currentPage: 1,
    maxPages: 3,
    allProducts: [],
    isActive: true
  });
  
  await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
  await scrapePageForSite('MercadoLibre', keywordId, keywordText, 1);
}

/**
 * Continuar con la siguiente página
 */
async function continueScrapingNextPage(keywordId: string): Promise<void> {
  const state = meliScrapingStates.get(keywordId);
  if (!state || !state.isActive) {
    console.log(`[Background] Estado no encontrado o inactivo para: ${keywordId}`);
    return;
  }
  
  if (state.currentPage >= state.maxPages) {
    console.log(`[Background] Máximo de páginas alcanzado (${state.maxPages})`);
    await finalizeMultiPageScraping(keywordId);
    return;
  }
  
  if (state.allProducts.length >= 100) {
    console.log(`[Background] Suficientes productos (${state.allProducts.length})`);
    await finalizeMultiPageScraping(keywordId);
    return;
  }
  
  state.currentPage++;
  console.log(`[Background] Continuando a página ${state.currentPage}`);
  
  await scrapePageForSite(state.site, state.keywordId, state.keywordText, state.currentPage);
}

/**
 * Finaliza el scraping multi-página - ASYNC para garantizar orden correcto
 */
async function finalizeMultiPageScraping(keywordId: string): Promise<void> {
  const state = meliScrapingStates.get(keywordId);
  if (!state) {
    console.log(`[Background] Finalize: estado no encontrado para ${keywordId}`);
    return;
  }
  
  console.log(`[Background] === FINALIZANDO ${keywordId}: ${state.allProducts.length} productos ===`);
  
  state.isActive = false;
  
  // PASO 1: Guardar productos primero (esto también actualiza productCount internamente)
  if (state.allProducts.length > 0) {
    console.log(`[Background] Guardando ${state.allProducts.length} productos...`);
    await StorageManager.saveProducts(state.keywordId, state.allProducts);
    console.log(`[Background] Productos guardados OK`);
  }
  
  // PASO 2: Actualizar estado a DONE (después de que productCount ya está actualizado)
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
  meliScrapingStates.delete(keywordId);
  
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
      const { keywordId, keywordText, site } = message.payload;
      
      if (site === 'MercadoLibre') {
        await startMeliMultiPageScraping(keywordId, keywordText);
      } else {
        await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
        await scrapePageForSite(site, keywordId, keywordText, 1);
      }
    }

    if (message.type === 'START_BOTH_SCRAPING' && message.payload.keywordText) {
      const { keywordId, keywordText } = message.payload;
      
      await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
      await scrapePageForSite('Falabella', keywordId, keywordText, 1);
      await startMeliMultiPageScraping(keywordId, keywordText);
    }

    if (message.type === 'CANCEL_SCRAPING') {
      const { keywordId } = message.payload;
      
      const state = meliScrapingStates.get(keywordId);
      if (state) {
        state.isActive = false;
        meliScrapingStates.delete(keywordId);
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
  console.log('Background: Content script:', message.action, 'productos:', message.products?.length);

  if (message.action === 'SCRAPING_PROGRESS') {
    StorageManager.updateProductCount(message.keywordId!, message.products?.length || 0);
    try {
      orchestrator.postMessage('SCRAPING_PROGRESS', message);
    } catch (e) { /* popup puede estar cerrado */ }
  }

  if (message.action === 'SCRAPING_DONE') {
    const products = message.products || [];
    const keywordId = message.keywordId!;
    
    console.log(`[Background] SCRAPING_DONE: ${products.length} productos de keywordId: ${keywordId}`);
    
    // Cerrar tab
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {});
    }
    
    // Verificar si es MercadoLibre multi-página
    const state = meliScrapingStates.get(keywordId);
    
    if (state && state.isActive) {
      // Es MercadoLibre multi-página
      state.allProducts.push(...products);
      console.log(`[Background] ML acumulado: ${state.allProducts.length} productos`);
      
      // Si devolvió menos de 48, es la última página
      if (products.length < 48) {
        console.log(`[Background] Última página (${products.length} < 48)`);
        // Usar IIFE async porque el callback de onMessage es síncrono
        (async () => {
          await finalizeMultiPageScraping(keywordId);
        })();
      } else {
        // Continuar con siguiente página
        continueScrapingNextPage(keywordId);
      }
    } else {
      // Es Falabella o scraping normal - usar async IIFE también
      console.log(`[Background] Falabella/normal: finalizando`);
      
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
    
    // Si era ML multi-página, finalizar con lo que tengamos
    const state = meliScrapingStates.get(keywordId);
    if (state && state.allProducts.length > 0) {
      // Usar IIFE async
      (async () => {
        await finalizeMultiPageScraping(keywordId);
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
