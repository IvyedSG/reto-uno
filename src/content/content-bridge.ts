import { ScrapingUpdate, Action } from '@/shared/types/message.types';
import { Site } from '@/shared/types/scraper.types';

export interface ScraperInstance {
  scrape(): Promise<any[]>;
}

export class ContentBridge {
  static listen(site: Site, createScraper: (kw: string, id: string, max: number) => ScraperInstance) {
    chrome.runtime.onMessage.addListener((message: ScrapingUpdate, _sender, sendResponse) => {
      if (message.action === 'START_SCRAPING' && message.keywordText) {
        (async () => {
          const maxProducts = message.maxProducts || (site === 'Falabella' ? 60 : 100);
          const scraper = createScraper(message.keywordText!, message.keywordId!, maxProducts);
          
          try {
            const products = await scraper.scrape();
            
            chrome.runtime.sendMessage({
              action: 'SCRAPING_DONE' as Action,
              keywordId: message.keywordId,
              site,
              products
            } as ScrapingUpdate);
            
            sendResponse({ success: true, count: products.length });
          } catch (error) {
            
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
