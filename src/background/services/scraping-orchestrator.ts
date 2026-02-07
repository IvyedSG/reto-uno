import { PortManager } from '../../shared/messaging/port-manager';
import { ScrapingUpdate, ScrapingMode } from '../../shared/types/message.types';
import { Product, KeywordStatus } from '../../shared/types/product.types';
import { Site } from '../../shared/types/scraper.types';
import { TabManager } from './tab-manager';
import { StorageManager } from '../../shared/utils/storage-manager';

export class ScrapingOrchestrator {
  private activeScraping: Map<string, {
    keywordText: string;
    site: Site;
    mode: ScrapingMode;
    products: Product[];
    totalExpected: number;
    pagesScraped: number;
    maxPages: number;
  }> = new Map();

  constructor(private messenger: PortManager) {}

  async startScraping(update: ScrapingUpdate) {
    const { keywordId, keywordText, site, maxProducts, maxPages } = update;
    if (!keywordId || !keywordText || !site) return;

    this.activeScraping.set(keywordId, {
      keywordText,
      site,
      mode: update.scrapingMode || 'fast',
      products: [],
      totalExpected: maxProducts || 100,
      pagesScraped: 0,
      maxPages: maxPages || 1
    });

    await this.scrapePage(keywordId, 0);
  }

  private async scrapePage(keywordId: string, pageIndex: number) {
    const session = this.activeScraping.get(keywordId);
    if (!session) return;

    const url = this.buildUrl(session.site, session.keywordText, pageIndex);
    
    try {
      const tabId = await TabManager.createTab(url);
      
      const response = await this.sendMessageToTab(tabId, {
        action: 'START_SCRAPING',
        keywordId,
        keywordText: session.keywordText,
        site: session.site,
        maxProducts: session.totalExpected
      });

      if (response && response.success) {
        console.log(`[Orchestrator] Página ${pageIndex + 1} iniciada en tab ${tabId}`);
      }
    } catch (error) {
      console.error('[Orchestrator] Error al abrir pestaña:', error);
      this.handleScrapingError(keywordId, String(error));
    }
  }

  private buildUrl(site: Site, keyword: string, pageIndex: number): string {
    const encodedKW = encodeURIComponent(keyword);
    if (site === 'Falabella') {
      return `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodedKW}${pageIndex > 0 ? `&page=${pageIndex + 1}` : ''}`;
    } else {
      const offset = pageIndex * 48 + 1;
      return `https://listado.mercadolibre.com.pe/${encodedKW}${pageIndex > 0 ? `_Desde_${offset}_NoIndex_True` : ''}`;
    }
  }

  async handleScrapingUpdate(update: ScrapingUpdate) {
    const { action, keywordId, products, error } = update;
    if (!keywordId) return;

    if (action === 'SCRAPING_ERROR') {
      this.handleScrapingError(keywordId, error || 'Error desconocido');
      return;
    }

    if (action === 'SCRAPING_DONE' && products) {
      await this.processPageResults(keywordId, products);
    }
  }

  private async processPageResults(keywordId: string, newProducts: Product[]) {
    const session = this.activeScraping.get(keywordId);
    if (!session) return;

    session.products.push(...newProducts);
    session.pagesScraped++;

    await TabManager.closeActiveTab();

    const reachedLimit = session.products.length >= session.totalExpected;
    const noMoreResults = newProducts.length === 0;
    const lastPage = session.pagesScraped >= session.maxPages;

    if (reachedLimit || noMoreResults || lastPage) {
      await this.finalizeScraping(keywordId);
    } else {
      await this.scrapePage(keywordId, session.pagesScraped);
    }
  }

  private async finalizeScraping(keywordId: string) {
    const session = this.activeScraping.get(keywordId);
    if (!session) return;

    const finalProducts = session.products.slice(0, session.totalExpected);
    await StorageManager.saveProducts(keywordId, finalProducts);
    await StorageManager.markSiteDone(keywordId, session.site);

    try {
      this.messenger.postMessage('SCRAPING_DONE', {
        keywordId,
        products: finalProducts
      });
    } catch (e) { /* Popup cerrado */ }

    this.activeScraping.delete(keywordId);
  }

  private handleScrapingError(keywordId: string, error: string) {
    console.error(`[Orchestrator] Error en ${keywordId}:`, error);
    this.activeScraping.delete(keywordId);
    StorageManager.updateKeywordStatus(keywordId, KeywordStatus.ERROR);
  }

  private sendMessageToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve) => {
      let retryCount = 0;
      const maxRetries = 10;
      
      const trySend = () => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(trySend, 500);
            } else {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            }
          } else {
            resolve(response);
          }
        });
      };
      
      setTimeout(trySend, 1500);
    });
  }

  async cancelScraping(keywordId: string) {
    this.activeScraping.delete(keywordId);
    await TabManager.closeActiveTab();
  }
}
