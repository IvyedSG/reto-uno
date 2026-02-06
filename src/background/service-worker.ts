import { PORT_NAMES, ScrapingUpdate, PortMessage, Site, KeywordStatus } from '../types';
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

/**
 * Orquestador central para la comunicación entre el popup y los content scripts.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAMES.SEARCH) return;

  console.log('Background: Nueva conexión establecida:', port.name);
  orchestrator.setPort(port);

  orchestrator.onMessage(async (message: PortMessage) => {
    console.log('Background: Mensaje recibido:', message.type);

    if (message.type === 'START_SCRAPING' && message.payload.site && message.payload.keywordText) {
      const { keywordId, keywordText, site } = message.payload;
      
      await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);

      const url = SEARCH_URLS[site](keywordText);
      const tab = await chrome.tabs.create({ 
        url, 
        active: false 
      });

      console.log(`Background: Tab ${tab.id} abierta en background para ${site} con keyword: ${keywordText}`);
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id!, {
              ...message.payload,
              tabId: tab.id
            });
          }, 2000);
        }
      });
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

chrome.runtime.onMessage.addListener(async (message: ScrapingUpdate, _sender) => {
  console.log('Background: Actualización de content script:', message.action);

  if (message.action === 'SCRAPING_PROGRESS') {
    await StorageManager.updateProductCount(message.keywordId, message.products?.length || 0);
    orchestrator.postMessage('SCRAPING_PROGRESS', message);
  }

  if (message.action === 'SCRAPING_DONE') {
    await StorageManager.updateKeywordStatus(message.keywordId, KeywordStatus.DONE);
    if (message.products) {
      await StorageManager.saveProducts(message.keywordId, message.products);
    }
    orchestrator.postMessage('SCRAPING_DONE', message);
  }

  if (message.action === 'SCRAPING_ERROR') {
    await StorageManager.updateKeywordStatus(message.keywordId, KeywordStatus.ERROR);
    orchestrator.postMessage('SCRAPING_ERROR', message);
  }
});
