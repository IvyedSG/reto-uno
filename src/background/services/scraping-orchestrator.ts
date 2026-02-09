import { Action, ScrapingUpdate } from '@/shared/types/message.types';
import { Product, KeywordStatus } from '@/shared/types/product.types';
import { Site } from '@/shared/types/scraper.types';
import { SEARCH_URLS } from '@/shared/constants/scraper-config';
import { StorageManager } from '@/shared/utils/storage-manager';
import { PortManager } from '@/shared/messaging/port-manager';
import { TabManager } from '@/background/services/tab-manager';

interface ScrapingState {
  keywordId: string;
  keywordText: string;
  site: Site;
  maxPages: number;
  maxProducts: number;
  isActive: boolean;
  initialProductCount: number;
  completedPages: number;
  totalProductsAcrossPages: Product[];
}

/**
 * Orquestador principal del proceso de scraping multitienda y multipágina.
 */
export class ScrapingOrchestrator {
  private states: Map<string, ScrapingState> = new Map();
  private lastStorageUpdate: Map<string, number> = new Map();

  constructor(private messenger: PortManager) {}

  private getStateKey(keywordId: string, site: Site): string {
    return `${keywordId}:${site}`;
  }

  /**
   * Inicia el flujo de scraping para un sitio específico.
   */
  async startScraping(update: ScrapingUpdate) {
    const { keywordId, keywordText, site, maxProducts, maxPages } = update;
    if (!keywordId || !keywordText || !site) return;

    const stateKey = this.getStateKey(keywordId, site);
    console.log(`[Orquestador] Iniciando ${site} para: ${keywordText}`);

    this.states.set(stateKey, {
      keywordId,
      keywordText,
      site,
      maxPages: maxPages || 1,
      maxProducts: maxProducts || 100,
      isActive: true,
      initialProductCount: 0,
      completedPages: 0,
      totalProductsAcrossPages: []
    });

    const products = await StorageManager.getProducts(keywordId);
    const existingCount = products.filter(p => p.site !== site).length;
    const currentState = this.states.get(stateKey);
    if (currentState) currentState.initialProductCount = existingCount;

    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
    
    const pagesToScrape = Array.from({ length: (maxPages || 1) }, (_, i) => i + 1);
    await Promise.all(pagesToScrape.map(page => this.scrapePage(stateKey, page)));
  }

  /**
   * Cancela cualquier proceso activo para una keyword.
   */
  async cancelScraping(keywordId: string): Promise<void> {
    for (const site of ['Falabella', 'MercadoLibre'] as Site[]) {
      const stateKey = this.getStateKey(keywordId, site);
      const state = this.states.get(stateKey);
      if (state) state.isActive = false;
      this.states.delete(stateKey);
    }
    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
  }

  /**
   * Procesa las actualizaciones enviadas por los content scripts.
   */
  async handleScrapingUpdate(update: ScrapingUpdate) {
    const { action, keywordId, site, products, error } = update;
    if (!keywordId || !site) return;

    if (action === 'SCRAPING_ERROR') {
      console.error(`[Orquestador] Error en ${site}:`, error);
      await this.finalizeScraping(this.getStateKey(keywordId, site));
      return;
    }

    if (action === 'SCRAPING_PROGRESS') {
      const stateKey = this.getStateKey(keywordId, site);
      const state = this.states.get(stateKey);
      
      if (state && state.isActive && products) {
        const currentCount = state.initialProductCount + state.totalProductsAcrossPages.length + products.length;
        
        const now = Date.now();
        const lastUpdate = this.lastStorageUpdate.get(stateKey) || 0;
        const shouldUpdateStorage = (now - lastUpdate > 1000);

        if (shouldUpdateStorage) {
          await StorageManager.updateProductCount(keywordId, currentCount);
          this.lastStorageUpdate.set(stateKey, now);
        }

        this.messenger.postMessage('SCRAPING_PROGRESS' as Action, {
          ...update,
          progress: currentCount
        });
        return;
      }

      this.messenger.postMessage('SCRAPING_PROGRESS' as Action, update);
      return;
    }

    if (action === 'SCRAPING_DONE' && products) {
      await this.handlePageDone(keywordId, site, products);
    }
  }

  private async handlePageDone(keywordId: string, site: Site, products: Product[]): Promise<void> {
    const stateKey = this.getStateKey(keywordId, site);
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    state.totalProductsAcrossPages.push(...products);
    state.completedPages++;

    if (state.completedPages >= state.maxPages || state.totalProductsAcrossPages.length >= state.maxProducts) {
      await this.finalizeScraping(stateKey);
    }
  }

  private async scrapePage(stateKey: string, page: number): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    const url = SEARCH_URLS[state.site](state.keywordText, page);
    
    let tabId: number | undefined;
    try {
      tabId = await TabManager.createTab(url, false);
      await TabManager.waitForLoad(tabId);
      
      const scriptFile = state.site === 'Falabella' ? 'content/falabella.js' : 'content/meli.js';
      await TabManager.injectScript(tabId, scriptFile);

      const port = await TabManager.connect(tabId);
      port.onMessage.addListener(async (msg: ScrapingUpdate) => {
        if (msg.action === 'SCRAPING_DONE') {
          if (tabId) await TabManager.closeTab(tabId);
        }
        this.handleScrapingUpdate(msg);
      });

      TabManager.sendMessage(tabId, {
        action: 'START_SCRAPING' as Action,
        keywordId: state.keywordId,
        keywordText: state.keywordText,
        site: state.site,
        maxProducts: state.maxProducts
      });
    } catch (error) {
      console.error(`[Orquestador] Error en página ${page}:`, error);
      if (tabId) await TabManager.closeTab(tabId);
      // Marcar una página como completada aunque falle para no bloquear el final
      await this.handlePageDone(state.keywordId, state.site, []);
    }
  }

  private async finalizeScraping(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    state.isActive = false;

    // TODO: Cerrar todas las pestañas asociadas a este proceso si fuera necesario.
    // Actualmente el TabManager solo cierra la pestaña cuando se le indica.
    // Podríamos mejorar el TabManager para rastrear pestañas por keyword.

    const final = state.totalProductsAcrossPages.slice(0, state.maxProducts);
    if (final.length > 0) {
      await StorageManager.saveProducts(state.keywordId, final);
    }

    await StorageManager.markSiteDone(state.keywordId, state.site);

    try {
      this.messenger.postMessage('SCRAPING_DONE' as Action, {
        keywordId: state.keywordId,
        products: final
      });
    } catch (e) {}

    this.states.delete(stateKey);
  }
}
