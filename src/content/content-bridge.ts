/**
 * Content Bridge - Shared logic for content script entry points
 */

import { ScrapingUpdate, Action } from '../shared/types/message.types';
import { Site } from '../shared/types/scraper.types';

export interface ScraperInstance {
  scrape(): Promise<any[]>;
}

export class ContentBridge {
  /**
   * Initialize a listener for the START_SCRAPING message
   */
  static listen(site: Site, createScraper: (kw: string, id: string, max: number) => ScraperInstance) {
    console.log(`[${site} Content Script] Loaded`);

    chrome.runtime.onMessage.addListener((message: ScrapingUpdate, _sender, sendResponse) => {
      if (message.action === 'START_SCRAPING' && message.keywordText) {
        console.log(`[${site}] Starting scraping for:`, message.keywordText);
        
        (async () => {
          const maxProducts = message.maxProducts || (site === 'Falabella' ? 60 : 100);
          const scraper = createScraper(message.keywordText!, message.keywordId!, maxProducts);
          
          try {
            const products = await scraper.scrape();
            console.log(`[${site}] Scraping complete:`, products.length, 'products');
            
            chrome.runtime.sendMessage({
              action: 'SCRAPING_DONE' as Action,
              keywordId: message.keywordId,
              site,
              products
            } as ScrapingUpdate);
            
            sendResponse({ success: true, count: products.length });
          } catch (error) {
            console.error(`[${site}] Error during scraping:`, error);
            
            chrome.runtime.sendMessage({
              action: 'SCRAPING_ERROR' as Action,
              keywordId: message.keywordId,
              site,
              error: String(error)
            } as ScrapingUpdate);
            
            sendResponse({ success: false, error: String(error) });
          }
        })();
        
        return true;
      }
      return false;
    });
  }
}
