import { Action, ScrapingUpdate } from '@/shared/types/message.types';
import { Product, KeywordStatus } from '@/shared/types/product.types';
import { Site } from '@/shared/types/scraper.types';
import { SEARCH_URLS, TIMEOUTS } from '@/shared/constants/scraper-config';
import { StorageManager } from '@/shared/utils/storage-manager';
import { PortManager } from '@/shared/messaging/port-manager';
import { TabManager } from '@/background/services/tab-manager';

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

/**
 * Orquestador principal del proceso de scraping multitienda y multipágina.
 */
export class ScrapingOrchestrator {
  private states: Map<string, ScrapingState> = new Map();

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
      currentPage: 1,
      maxPages: maxPages || 1,
      maxProducts: maxProducts || 100,
      allProducts: [],
      isActive: true
    });

    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
    await this.scrapeCurrentPage(stateKey);
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
    await TabManager.closeActiveTab();
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

    await TabManager.closeActiveTab();

    if (!state || !state.isActive) return;

    state.allProducts.push(...products);
    console.log(`[Orquestador] ${site}: ${state.allProducts.length} productos acumulados`);

    const reachedLimit = state.allProducts.length >= state.maxProducts;
    const noMoreResults = products.length === 0;
    const lastPageReached = state.currentPage >= state.maxPages;

    if (reachedLimit || noMoreResults || lastPageReached) {
      await this.finalizeScraping(stateKey);
    } else {
      await this.continueToNextPage(stateKey);
    }
  }

  private async continueToNextPage(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    state.currentPage++;
    await this.scrapeCurrentPage(stateKey);
  }

  private async scrapeCurrentPage(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    const url = SEARCH_URLS[state.site](state.keywordText, state.currentPage);
    
    try {
      const tabId = await TabManager.createTab(url, false);
      await TabManager.waitForLoad(tabId);
      
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.BETWEEN_PAGES));

      const scriptFile = state.site === 'Falabella' ? 'content/falabella.js' : 'content/meli.js';
      await TabManager.injectScript(tabId, scriptFile);

      const port = await TabManager.connect(tabId);
      port.onMessage.addListener((msg: ScrapingUpdate) => {
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
      console.error(`[Orquestador] Error en navegación:`, error);
      await this.finalizeScraping(stateKey);
    }
  }

  private async finalizeScraping(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state) return;

    state.isActive = false;

    const final = state.allProducts.slice(0, state.maxProducts);
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
