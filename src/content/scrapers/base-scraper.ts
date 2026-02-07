import { Product } from '@/shared/types/product.types';
import { ScrapingUpdate } from '@/shared/types/message.types';

export abstract class BaseScraper {
  protected siteName: 'Falabella' | 'MercadoLibre';
  protected keyword: string;
  protected keywordId: string;
  protected maxProducts: number;

  constructor(siteName: 'Falabella' | 'MercadoLibre', keyword: string, keywordId: string, maxProducts: number) {
    this.siteName = siteName;
    this.keyword = keyword;
    this.keywordId = keywordId;
    this.maxProducts = maxProducts;
  }

  abstract scrape(): Promise<Product[]>;

  protected reportProgress(progress: number, products?: Product[]) {
    const update: ScrapingUpdate = {
      action: 'SCRAPING_PROGRESS',
      keywordId: this.keywordId,
      site: this.siteName,
      progress,
      products
    };
    chrome.runtime.sendMessage(update);
  }

  protected wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected findOne(parent: Element | Document, selectors: string[]): Element | null {
    for (const selector of selectors) {
      const el = parent.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  protected findAll(selectors: string[]): Element[] {
    for (const selector of selectors) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) return Array.from(els);
    }
    return [];
  }

  protected async scrollFullPage(steps: number = 8, delay: number = 250): Promise<void> {
    const totalHeight = document.documentElement.scrollHeight;
    const stepHeight = totalHeight / steps;
    
    for (let i = 0; i < steps; i++) {
      window.scrollTo({ top: i * stepHeight, behavior: 'smooth' });
      await this.wait(delay);
    }
    
    window.scrollTo({ top: totalHeight, behavior: 'smooth' });
    await this.wait(delay * 2);
  }

  protected async waitForElements(selector: string, maxWaitMs: number = 8000): Promise<boolean> {
    const interval = 200;
    let waited = 0;
    
    while (waited < maxWaitMs) {
      if (document.querySelectorAll(selector).length > 0) return true;
      await this.wait(interval);
      waited += interval;
    }
    return false;
  }

  protected parseCurrencyPrice(priceText: string | null): number | null {
    if (!priceText) return null;
    
    const clean = priceText.replace(/S\/\s*/gi, '').replace(/,/g, '').trim();
    const num = parseFloat(clean);
    
    return (!isNaN(num) && num > 0) ? Math.round(num) : null;
  }

  protected isDuplicate(products: Product[], product: Product): boolean {
    return products.some(p => p.url === product.url);
  }
}
