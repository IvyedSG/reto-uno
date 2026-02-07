import { Product } from '../../shared/types/product.types';
import { Site } from '../../shared/types/scraper.types';

export abstract class BaseScraper {
  constructor(
    protected keywordText: string,
    protected keywordId: string,
    protected maxProducts: number,
    protected site: Site
  ) {}

  abstract scrape(): Promise<Product[]>;

  protected async autoScroll(maxScrolls: number = 20): Promise<void> {
    let scrolls = 0;
    while (scrolls < maxScrolls) {
      window.scrollTo(0, document.body.scrollHeight);
      await this.sleep(100);
      scrolls++;
      
      if (document.querySelectorAll(this.getProductSelector()).length >= this.maxProducts) {
        break;
      }
    }
  }

  protected abstract getProductSelector(): string;

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected wait(ms: number): Promise<void> {
    return this.sleep(ms);
  }

  protected async waitForElements(selector: string, maxWaitMs: number = 8000): Promise<boolean> {
    const interval = 200;
    let waited = 0;
    
    while (waited < maxWaitMs) {
      if (document.querySelectorAll(selector).length > 0) return true;
      await this.sleep(interval);
      waited += interval;
    }
    return false;
  }

  protected parseCurrencyPrice(priceText: string | null): number | null {
    if (!priceText) return null;
    
    let clean = priceText.replace(/S\/\s*/gi, '').replace(/,/g, '').trim();
    const num = parseFloat(clean);
    
    if (isNaN(num) || num <= 0) {
      return null;
    }
    
    return Math.round(num);
  }

  protected isDuplicate(products: Product[], product: Product): boolean {
    return products.some(p => p.url === product.url);
  }
}
