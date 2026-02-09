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
    window.dispatchEvent(new CustomEvent('scraping-progress', { detail: update }));
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

  protected async scrollFullPage(steps: number = 6, delay: number = 50): Promise<void> {
    const totalHeight = document.documentElement.scrollHeight;
    const stepHeight = totalHeight / steps;
    
    for (let i = 0; i < steps; i++) {
      window.scrollTo({ top: i * stepHeight, behavior: 'auto' });
      await this.wait(delay);
    }
    
    window.scrollTo({ top: totalHeight, behavior: 'auto' });
    await this.wait(50);
  }

  protected async waitForElements(selector: string, maxWaitMs: number = 8000, negativeSelector?: string): Promise<boolean> {
    const interval = 200;
    let waited = 0;
    
    while (waited < maxWaitMs) {
      if (document.querySelectorAll(selector).length > 0) return true;
      if (negativeSelector && document.querySelectorAll(negativeSelector).length > 0) {
        console.warn(`[BaseScraper] Detención temprana: se encontró selector negativo "${negativeSelector}"`);
        return false;
      }
      await this.wait(interval);
      waited += interval;
    }
    return false;
  }

  protected parseCurrencyPrice(priceText: string | null): number | null {
    if (!priceText) return null;
    
    let clean = priceText.replace(/S\/\s*/gi, '').trim();
    
    if (clean.includes('.') && !clean.includes(',')) {
      const parts = clean.split('.');
      if (parts.length > 1 && parts[parts.length - 1].length === 3) {
        clean = clean.replace(/\./g, '');
      }
    } else {
      clean = clean.replace(/,/g, '');
    }

    const num = parseFloat(clean);
    return (!isNaN(num) && num > 0) ? Math.round(num) : null;
  }

  protected isDuplicate(products: Product[], product: Product): boolean {
    return products.some(p => p.url === product.url);
  }
}
