import { BaseScraper } from '@/content/scrapers/base-scraper';
import { Product } from '@/shared/types/product.types';

export class MercadoLibreScraper extends BaseScraper {
  private readonly SELECTORS = {
    cards: 'li.ui-search-layout__item, .poly-card',
    titleLink: 'a.poly-component__title, a.ui-search-item__group__element.ui-search-link, .poly-component__title a',
    priceContainer: '.andes-money-amount:not(.andes-money-amount--previous)',
    priceFraction: '.andes-money-amount__fraction',
    seller: '.poly-component__seller, .ui-search-official-store-item__link, .ui-search-item__group__element--seller'
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

        if ((i + 1) % 10 === 0 || i === cards.length - 1) {
          const progress = Math.min(Math.round(((i + 1) / cards.length) * 100), 100);
          this.reportProgress(progress, results);
        }
      }
    } catch (error) {
      console.error('[MercadoLibre] Error de extracción:', error);
      this.reportProgress(100, results);
    }
    
    return results;
  }

  private extractProduct(card: HTMLElement, position: number): Product | null {
    const titleLink = card.querySelector(this.SELECTORS.titleLink) as HTMLAnchorElement;
    if (!titleLink) return null;
    
    const priceContainer = card.querySelector(this.SELECTORS.priceContainer);
    if (!priceContainer) return null;

    const fractionEl = priceContainer.querySelector(this.SELECTORS.priceFraction);
    const priceVisible = fractionEl?.textContent?.trim() || '';
    const priceNumeric = this.parseCurrencyPrice(priceVisible);
    
    if (priceNumeric === null) return null;

    const sellerEl = card.querySelector(this.SELECTORS.seller);
    const imageUrl = (card.querySelector('img') as HTMLImageElement)?.src || '';
    
    return {
      id: crypto.randomUUID(),
      title: titleLink.textContent?.trim() || '',
      priceVisible: `S/ ${priceVisible}`,
      priceNumeric,
      imageUrl,
      url: titleLink.href || '',
      site: 'MercadoLibre',
      scrapedAt: Date.now(),
      position,
      seller: sellerEl?.textContent?.replace(/por\s+/i, '').trim() || null
    };
  }
}
