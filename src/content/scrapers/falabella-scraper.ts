import { BaseScraper } from '@/content/scrapers/base-scraper';
import { Product } from '@/shared/types/product.types';

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
    const results: Product[] = [];
    
    await this.waitForElements(this.SELECTORS.productCards[0], 5000);
    await this.scrollFullPage(6, 300);
    
    const cards = this.findAll(this.SELECTORS.productCards);

    for (const card of cards) {
      if (results.length >= this.maxProducts) break;
      
      const product = this.extractProduct(card as HTMLElement);
      if (product && !this.isDuplicate(results, product)) {
        results.push(product);
      }
    }

    const progress = Math.min(Math.round((results.length / this.maxProducts) * 100), 100);
    this.reportProgress(progress, results);

    return results;
  }

  private extractProduct(card: HTMLElement): Product | null {
    const url = (card as HTMLAnchorElement).href || '';
    if (!url) return null;

    const brandEl = this.findOne(card, this.SELECTORS.brand);
    const nameEl = this.findOne(card, this.SELECTORS.productName);
    const priceEl = this.findOne(card, this.SELECTORS.price);

    const title = nameEl?.textContent?.trim() || brandEl?.textContent?.trim() || '';
    if (!title) return null;

    const priceNumeric = this.parseCurrencyPrice(priceEl?.textContent?.trim() || '');
    if (priceNumeric === null) return null;

    return {
      id: crypto.randomUUID(),
      title,
      priceNumeric,
      imageUrl: (card.querySelector('img') as HTMLImageElement)?.src || '',
      url,
      site: 'Falabella',
      scrapedAt: Date.now()
    };
  }
}
