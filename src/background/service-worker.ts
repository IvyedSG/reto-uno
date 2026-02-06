import { PORT_NAMES, ScrapingUpdate, PortMessage, Site, KeywordStatus, Product } from '../types';
import { PortManager } from '../utils/messaging';
import { StorageManager } from '../utils/storage-manager';

chrome.runtime.onInstalled.addListener(() => {
  console.log('PrecioScout Service Worker Initialized');
});

const orchestrator = new PortManager();

// URLs de búsqueda por sitio
const SEARCH_URLS: Record<Site, (keyword: string) => string> = {
  Falabella: (kw) => `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodeURIComponent(kw)}`,
  MercadoLibre: (kw) => `https://listado.mercadolibre.com.pe/${encodeURIComponent(kw.replace(/ /g, '-'))}`
};

// Archivo del content script por sitio
const CONTENT_SCRIPTS: Record<Site, string> = {
  Falabella: 'content/falabella.js',
  MercadoLibre: 'content/meli.js'
};

// Cola para procesar mensajes SCRAPING_DONE secuencialmente
interface QueuedMessage {
  keywordId: string;
  products: Product[];
}

let messageQueue: QueuedMessage[] = [];
let isProcessingQueue = false;

async function processQueue(): Promise<void> {
  if (isProcessingQueue || messageQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift()!;
    console.log(`[Queue] Procesando mensaje para keywordId: ${msg.keywordId}, productos: ${msg.products.length}`);
    
    try {
      await StorageManager.saveProducts(msg.keywordId, msg.products);
      console.log(`[Queue] Guardado completado para keywordId: ${msg.keywordId}`);
    } catch (error) {
      console.error(`[Queue] Error guardando productos:`, error);
    }
  }
  
  isProcessingQueue = false;
}

function enqueueMessage(keywordId: string, products: Product[]): void {
  console.log(`[Queue] Encolando mensaje para keywordId: ${keywordId}, productos: ${products.length}`);
  messageQueue.push({ keywordId, products });
  // Procesar la cola de forma asíncrona
  processQueue();
}

/**
 * Inject content script and send scraping message
 */
async function injectAndStartScraping(
  tabId: number, 
  site: Site,
  keywordId: string,
  keywordText: string
): Promise<void> {
  try {
    // Wait for page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Inject the content script programmatically
    console.log(`Background: Inyectando script para ${site} en tab ${tabId}`);
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPTS[site]]
    });
    
    console.log(`Background: Script inyectado para ${site}, esperando a que se inicialice...`);
    
    // Wait for script to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send the start scraping message
    await chrome.tabs.sendMessage(tabId, {
      action: 'START_SCRAPING',
      keywordId,
      keywordText,
      site,
      tabId
    });
    
    console.log(`Background: Mensaje START_SCRAPING enviado a ${site}`);
  } catch (error) {
    console.error(`Background: Error inyectando script para ${site}:`, error);
  }
}

/**
 * Orquestador central para la comunicación entre el popup y los content scripts.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAMES.SEARCH) return;

  console.log('Background: Nueva conexión establecida:', port.name);
  orchestrator.setPort(port);

  orchestrator.onMessage(async (message: PortMessage) => {
    console.log('Background: Mensaje recibido:', message.type);

    // Handler para scraping de un solo sitio
    if (message.type === 'START_SCRAPING' && message.payload.site && message.payload.keywordText) {
      const { keywordId, keywordText, site } = message.payload;
      
      await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);

      const url = SEARCH_URLS[site](keywordText);
      const tab = await chrome.tabs.create({ 
        url, 
        active: false 
      });

      console.log(`Background: Tab ${tab.id} abierta para ${site} con keyword: ${keywordText}`);
      
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          injectAndStartScraping(tab.id!, site, keywordId, keywordText);
        }
      });
    }

    // Handler para scraping de AMBOS sitios simultáneamente
    if (message.type === 'START_BOTH_SCRAPING' && message.payload.keywordText) {
      const { keywordId, keywordText } = message.payload;
      
      await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);

      const sites: Site[] = ['Falabella', 'MercadoLibre'];
      
      for (const site of sites) {
        const url = SEARCH_URLS[site](keywordText);
        const tab = await chrome.tabs.create({ 
          url, 
          active: false 
        });

        console.log(`Background: Tab ${tab.id} abierta para ${site} con keyword: ${keywordText}`);
        
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            injectAndStartScraping(tab.id!, site, keywordId, keywordText);
          }
        });
      }
    }

    if (message.type === 'CANCEL_SCRAPING') {
      const { keywordId } = message.payload;
      await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
    }
  });

  orchestrator.onDisconnect(() => {
    console.log('Background: Conexión cerrada');
  });
});

chrome.runtime.onMessage.addListener((message: ScrapingUpdate, _sender) => {
  console.log('Background: Actualización de content script:', message.action);

  if (message.action === 'SCRAPING_PROGRESS') {
    StorageManager.updateProductCount(message.keywordId, message.products?.length || 0);
    orchestrator.postMessage('SCRAPING_PROGRESS', message);
  }

  if (message.action === 'SCRAPING_DONE') {
    console.log(`Background: SCRAPING_DONE recibido con ${message.products?.length || 0} productos`);
    StorageManager.updateKeywordStatus(message.keywordId, KeywordStatus.DONE);
    
    if (message.products && message.products.length > 0) {
      // Encolar para procesamiento secuencial
      enqueueMessage(message.keywordId, message.products);
    }
    
    orchestrator.postMessage('SCRAPING_DONE', message);
  }

  if (message.action === 'SCRAPING_ERROR') {
    StorageManager.updateKeywordStatus(message.keywordId, KeywordStatus.ERROR);
    orchestrator.postMessage('SCRAPING_ERROR', message);
  }
  
  // Retornar true para indicar que manejaremos async (aunque ahora usamos cola)
  return true;
});
