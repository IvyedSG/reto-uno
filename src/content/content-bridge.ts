import { ScrapingUpdate, Action } from '@/shared/types/message.types';
import { Site } from '@/shared/types/scraper.types';

export interface ScraperInstance {
  scrape(): Promise<any[]>;
}

export class ContentBridge {
  static listen(site: Site, createScraper: (kw: string, id: string, max: number) => ScraperInstance) {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== 'content-bridge') return;

      const progressHandler = (e: any) => {
        port.postMessage(e.detail);
      };
      window.addEventListener('scraping-progress', progressHandler);
      port.onDisconnect.addListener(() => window.removeEventListener('scraping-progress', progressHandler));

      port.onMessage.addListener(async (message: ScrapingUpdate) => {
        if (message.action === 'START_SCRAPING' && message.keywordText) {
          const maxProducts = message.maxProducts || (site === 'Falabella' ? 60 : 100);
          const scraper = createScraper(message.keywordText!, message.keywordId!, maxProducts);
          
          try {
            const products = await scraper.scrape();
            
            port.postMessage({
              action: 'SCRAPING_DONE' as Action,
              keywordId: message.keywordId,
              site,
              products
            } as ScrapingUpdate);
            
          } catch (error) {
            port.postMessage({
              action: 'SCRAPING_ERROR' as Action,
              keywordId: message.keywordId,
              site,
              error: String(error)
            } as ScrapingUpdate);
          }
        }
      });
    });
  }
}
