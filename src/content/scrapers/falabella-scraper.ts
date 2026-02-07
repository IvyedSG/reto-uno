/**
 * Falabella Scraper - Product extraction from Falabella Peru
 * 
 * Handles single-page scraping. Pagination is managed by the
 * background service worker which opens multiple tabs.
 */

import { BaseScraper } from './base-scraper';
import { Product } from '../../shared/types/product.types';

export class FalabellaScraper extends BaseScraper {
  private readonly SELECTORS = {
    productCards: ['a.pod-link', '.pod-link'],
    brand: ['b.pod-title', '.pod-title'],
    productName: ['b.pod-subTitle', '.pod-subTitle', '.pod-description'],
    price: ['li.prices-0 span.copy10', 'li.prices-0 span', '.prices-0', '.copy10.primary']
  };

  constructor(keyword: string, keywordId: string, maxProducts: number = 60) {
    super('Falabella', keyword, keywordId, maxProducts);
  }

  async scrape(): Promise<Product[]> {
    console.log(`[Falabella] Started scraping: ${this.keyword}`);
    const results: Product[] = [];
    
    // Wait for product cards to appear
    const found = await this.waitForElements(this.SELECTORS.productCards[0], 5000);
    if (!found) console.warn('[Falabella] Product cards not found within timeout');

    // Perform initial scroll to trigger lazy loading
    await this.scrollFullPage(6, 300);
    
    const cards = this.findAll(this.SELECTORS.productCards);
    console.log(`[Falabella] Found ${cards.length} cards`);

    for (const card of cards) {
      if (results.length >= this.maxProducts) break;
      
      const product = this.extractProduct(card as HTMLElement, results.length + 1);
      if (product && !this.isDuplicate(results, product)) {
        results.push(product);
      }
    }

    const progress = Math.min(Math.round((results.length / this.maxProducts) * 100), 100);
    this.reportProgress(progress, results);

    console.log(`[Falabella] Extraction complete: ${results.length} products`);
    return results;
  }

  private extractProduct(card: HTMLElement, position: number): Product | null {
    const url = (card as HTMLAnchorElement).href || '';
    if (!url) return null;

    const brandEl = this.findOne(card, this.SELECTORS.brand);
    const nameEl = this.findOne(card, this.SELECTORS.productName);
    const priceEl = this.findOne(card, this.SELECTORS.price);

    const brand = brandEl?.textContent?.trim() || '';
    const productName = nameEl?.textContent?.trim() || '';
    const title = productName || brand || '';
    
    if (!title) return null;

    const priceRaw = priceEl?.textContent?.trim() || '';
    const priceNumeric = this.parseCurrencyPrice(priceRaw);

    if (priceNumeric === null) return null;

    return {
      site: 'Falabella',
      keyword: this.keyword,
      keywordId: this.keywordId,
      timestamp: Date.now(),
      position,
      title,
      priceVisible: priceRaw || 'N/A',
      priceNumeric,
      url,
      brand: brand || null,
      seller: null
    };
  }
}
