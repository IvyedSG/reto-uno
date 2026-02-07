/**
 * Scraping Orchestrator - Manages multi-page scraping flows and state
 */

import { Site } from '../../shared/types/scraper.types';
import { Product, KeywordStatus } from '../../shared/types/product.types';
import { SEARCH_URLS, TIMEOUTS } from '../../shared/constants/scraper-config';
import { StorageManager } from '../../shared/utils/storage-manager';
import { PortManager } from '../../shared/messaging/port-manager';
import { TabManager } from './tab-manager';

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

export class ScrapingOrchestrator {
  private states: Map<string, ScrapingState> = new Map();
  private messenger: PortManager;

  constructor(messenger: PortManager) {
    this.messenger = messenger;
  }

  private getStateKey(keywordId: string, site: Site): string {
    return `${keywordId}:${site}`;
  }

  /**
   * Start a multi-page scraping session for a specific site
   */
  async startScraping(
    site: Site,
    keywordId: string,
    keywordText: string,
    maxProducts: number,
    maxPages: number
  ): Promise<void> {
    const stateKey = this.getStateKey(keywordId, site);
    console.log(`[Orchestrator] Starting ${site} multi-page for: ${keywordId}`);

    this.states.set(stateKey, {
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
    await this.scrapeCurrentPage(stateKey);
  }

  /**
   * Cancel scraping for a specific keyword across all sites
   */
  async cancelScraping(keywordId: string): Promise<void> {
    for (const site of ['Falabella', 'MercadoLibre'] as Site[]) {
      const stateKey = this.getStateKey(keywordId, site);
      const state = this.states.get(stateKey);
      if (state) {
        state.isActive = false;
        this.states.delete(stateKey);
      }
    }
    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
  }

  /**
   * Handle progress updates from content scripts
   */
  handleProgress(keywordId: string, productCount: number, products?: Product[]): void {
    StorageManager.updateProductCount(keywordId, productCount);
    try {
      this.messenger.postMessage('SCRAPING_PROGRESS', { 
        keywordId, 
        products, 
        progress: 0 
      });
    } catch (e) { /* Extension popup might be closed */ }
  }

  /**
   * Handle completion of a single page scraping
   */
  async handlePageDone(keywordId: string, site: Site, products: Product[], tabId?: number): Promise<void> {
    const stateKey = this.getStateKey(keywordId, site);
    const state = this.states.get(stateKey);

    if (tabId) {
      await TabManager.closeTab(tabId);
    }

    if (!state || !state.isActive) {
      if (products.length > 0) {
        await StorageManager.saveProducts(keywordId, products);
        await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.DONE);
      }
      return;
    }

    state.allProducts.push(...products);
    console.log(`[Orchestrator] ${site} accumulated: ${state.allProducts.length} products`);

    const productsPerPage = site === 'MercadoLibre' ? 48 : 40;

    if (
      products.length < productsPerPage || 
      state.allProducts.length >= state.maxProducts ||
      state.currentPage >= state.maxPages
    ) {
      await this.finalizeScraping(stateKey);
    } else {
      await this.continueToNextPage(stateKey);
    }
  }

  private async continueToNextPage(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    state.currentPage++;
    console.log(`[Orchestrator] Continuing ${state.site} to page ${state.currentPage}`);
    await this.scrapeCurrentPage(stateKey);
  }

  private async scrapeCurrentPage(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state || !state.isActive) return;

    const url = SEARCH_URLS[state.site](state.keywordText, state.currentPage);
    console.log(`[Orchestrator] Opening ${state.site} page ${state.currentPage}: ${url}`);

    try {
      const tabId = await TabManager.createTab(url, false);
      await TabManager.waitForLoad(tabId);
      
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.BETWEEN_PAGES));

      const scriptFile = state.site === 'Falabella' ? 'content/falabella.js' : 'content/meli.js';
      await TabManager.injectScript(tabId, scriptFile);

      await TabManager.sendMessage(tabId, {
        action: 'START_SCRAPING',
        keywordId: state.keywordId,
        keywordText: state.keywordText,
        site: state.site,
        tabId,
        page: state.currentPage,
        maxProducts: state.maxProducts
      });
    } catch (error) {
      console.error(`[Orchestrator] Error on page ${state.currentPage}:`, error);
      await this.finalizeScraping(stateKey);
    }
  }

  private async finalizeScraping(stateKey: string): Promise<void> {
    const state = this.states.get(stateKey);
    if (!state) return;

    console.log(`[Orchestrator] Finalizing ${state.site} for ${state.keywordId}`);
    state.isActive = false;

    const productsToSave = state.allProducts.slice(0, state.maxProducts);
    if (productsToSave.length > 0) {
      await StorageManager.saveProducts(state.keywordId, productsToSave);
    }

    await StorageManager.markSiteDone(state.keywordId, state.site);

    try {
      this.messenger.postMessage('SCRAPING_DONE', {
        keywordId: state.keywordId,
        products: state.allProducts
      });
    } catch (e) { /* Popup may be closed */ }

    this.states.delete(stateKey);
  }
}
