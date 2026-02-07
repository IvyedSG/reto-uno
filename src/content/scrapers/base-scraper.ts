import { Product } from '../../shared/types/product.types';
import { ScrapingUpdate } from '../../shared/types/message.types';

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

  /**
   * Main scrape loop - to be implemented by children
   */
  abstract scrape(): Promise<Product[]>;

  /**
   * Report progress back to background script
   */
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

  /**
   * Wait utility
   */
  protected wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility to find elements using multiple selectors
   */
  protected findOne(parent: Element | Document, selectors: string[]): Element | null {
    for (const selector of selectors) {
      const el = parent.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  /**
   * Utility to find all elements using multiple selectors
   */
  protected findAll(selectors: string[]): Element[] {
    for (const selector of selectors) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        return Array.from(els);
      }
    }
    return [];
  }

  /**
   * Standardized scroll logic
   */
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

  /**
   * Wait for specific elements to appear on the page
   */
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

  /**
   * Clean numeric prices from currency strings (S/ 1,299.90 -> 1300)
   * Handles commas, dots, and S/ prefix.
   * Replaces the simpler parsePrice.
   */
  protected parseCurrencyPrice(priceText: string): number | null {
    if (!priceText) return null;
    
    // Remove "S/", spaces, and commas (thousands separator)
    let clean = priceText.replace(/S\/\s*/gi, '').replace(/,/g, '').trim();
    
    // Parse as float
    const num = parseFloat(clean);
    
    // Reject NaN or non-positive prices (filtering bad data like S/ -1)
    if (isNaN(num) || num <= 0) {
      return null;
    }
    
    return Math.round(num);
  }

  /**
   * Legacy simple price parser - kept for compatibility but preferred parseCurrencyPrice
   */
  protected parsePrice(priceText: string): number | null {
    if (!priceText) return null;
    const clean = priceText.replace(/[^\d]/g, '');
    return clean ? parseInt(clean, 10) : null;
  }

  /**
   * Check if a product is a duplicate in the results list (by URL)
   */
  protected isDuplicate(products: Product[], product: Product): boolean {
    return products.some(p => p.url === product.url);
  }
}
