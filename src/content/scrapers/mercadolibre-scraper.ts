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
      
      for (let i = 0; i < cards.length; i++) {
        if (results.length >= this.maxProducts) break;
        
        const product = this.extractProduct(cards[i] as HTMLElement, i + 1);
        if (product && !this.isDuplicate(results, product)) {
          results.push(product);
        }
      }
    } catch (error) {
      console.error('[MercadoLibre] Error de extracción:', error);
    }
    
    return results;
  }

  private extractProduct(card: HTMLElement, position: number): Product | null {
    const titleLink = card.querySelector(this.SELECTORS.titleLink) as HTMLAnchorElement;
    if (!titleLink?.href) return null;
    
    const priceEl = card.querySelector(this.SELECTORS.priceFraction);
    const priceVisible = priceEl?.parentElement?.textContent?.trim() || '';
    const priceNumeric = this.parseCurrencyPrice(priceEl?.textContent?.trim() || '');
    if (priceNumeric === null) return null;

    const sellerEl = card.querySelector('.poly-component__seller');
    
    return {
      id: crypto.randomUUID(),
      title: titleLink.textContent?.trim() || '',
      priceVisible: `S/ ${priceVisible}`,
      priceNumeric,
      imageUrl: (card.querySelector('img') as HTMLImageElement)?.src || '',
      url: titleLink.href,
      site: 'MercadoLibre',
      scrapedAt: Date.now(),
      position,
      seller: sellerEl?.textContent?.replace(/por\s+/i, '').trim() || null
    };
  }
}
