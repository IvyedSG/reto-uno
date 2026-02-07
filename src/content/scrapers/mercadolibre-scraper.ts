import { BaseScraper } from '@/content/scrapers/base-scraper';
import { Product } from '@/shared/types/product.types';

export class MercadoLibreScraper extends BaseScraper {
  private readonly SELECTORS = {
    cards: 'li.ui-search-layout__item',
    titleLink: 'a.poly-component__title, a.ui-search-item__group__element.ui-search-link',
    priceFraction: '.andes-money-amount__fraction'
  };

  constructor(keyword: string, keywordId: string, maxProducts: number = 100) {
    super('MercadoLibre', keyword, keywordId, maxProducts);
  }

  async scrape(): Promise<Product[]> {
    const results: Product[] = [];
    
    try {
      await this.waitForElements(this.SELECTORS.cards, 5000);
      await this.scrollFullPage(5, 100);
      
      const cards = document.querySelectorAll(this.SELECTORS.cards);
      
      for (const card of cards) {
        if (results.length >= this.maxProducts) break;
        
        const product = this.extractProduct(card as HTMLElement);
        if (product && !this.isDuplicate(results, product)) {
          results.push(product);
        }
      }
    } catch (error) {
      console.error('[MercadoLibre] Error de extracción:', error);
    }
    
    return results;
  }

  private extractProduct(card: HTMLElement): Product | null {
    const titleLink = card.querySelector(this.SELECTORS.titleLink) as HTMLAnchorElement;
    if (!titleLink?.href) return null;
    
    const priceEl = card.querySelector(this.SELECTORS.priceFraction);
    const priceNumeric = this.parseCurrencyPrice(priceEl?.textContent?.trim() || '');
    if (priceNumeric === null) return null;
    
    return {
      id: crypto.randomUUID(),
      title: titleLink.textContent?.trim() || '',
      priceNumeric,
      imageUrl: (card.querySelector('img') as HTMLImageElement)?.src || '',
      url: titleLink.href,
      site: 'MercadoLibre',
      scrapedAt: Date.now()
    };
  }
}
