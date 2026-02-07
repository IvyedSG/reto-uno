/**
 * MercadoLibre Scraper - Product extraction from MercadoLibre Peru
 * 
 * Handles single-page scraping. Pagination is managed by the
 * background service worker which opens multiple tabs.
 */

import { BaseScraper } from './base-scraper';
import { Product } from '../../shared/types/product.types';

export class MercadoLibreScraper extends BaseScraper {
  private readonly SELECTORS = {
    cards: 'li.ui-search-layout__item',
    titleLink: 'a.poly-component__title',
    priceFraction: '.andes-money-amount__fraction'
  };

  constructor(keyword: string, keywordId: string, maxProducts: number = 100) {
    super('MercadoLibre', keyword, keywordId, maxProducts);
  }

  async scrape(): Promise<Product[]> {
    console.log(`[MercadoLibre] Started scraping: ${this.keyword}`);
    const results: Product[] = [];
    
    try {
      await this.waitForElements(this.SELECTORS.cards, 5000);
      await this.scrollFullPage(5, 100);
      
      const cards = document.querySelectorAll(this.SELECTORS.cards);
      console.log(`[MercadoLibre] Found ${cards.length} cards`);
      
      for (const card of cards) {
        if (results.length >= this.maxProducts) break;
        
        const product = this.extractProduct(card as HTMLElement);
        if (product && !this.isDuplicate(results, product)) {
          product.position = results.length + 1;
          results.push(product);
        }
      }
    } catch (error) {
      console.error('[MercadoLibre] Error:', error);
    }
    
    console.log(`[MercadoLibre] Extraction complete: ${results.length} products`);
    return results;
  }

  private extractProduct(card: HTMLElement): Product | null {
    const titleLink = card.querySelector(this.SELECTORS.titleLink) as HTMLAnchorElement;
    if (!titleLink || !titleLink.href) return null;
    
    const title = titleLink.textContent?.trim() || '';
    const url = titleLink.href;
    
    const priceEl = card.querySelector(this.SELECTORS.priceFraction);
    const priceRaw = priceEl?.textContent?.trim() || '';
    const priceNumeric = this.parseCurrencyPrice(priceRaw);
    
    if (priceNumeric === null) return null;
    const priceVisible = `S/ ${priceNumeric.toLocaleString('es-PE')}`;
    
    return {
      site: 'MercadoLibre',
      keyword: this.keyword,
      keywordId: this.keywordId,
      timestamp: Date.now(),
      position: 0,
      title,
      priceVisible,
      priceNumeric,
      url,
      brand: null,
      seller: null
    };
  }
}
