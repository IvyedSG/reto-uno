import { BaseScraper } from './base-scraper';
import { Product } from '../../shared/types/product.types';

export class MercadoLibreScraper extends BaseScraper {
  constructor(keyword: string, keywordId: string, maxProducts: number = 100) {
    super(keyword, keywordId, maxProducts, 'MercadoLibre');
  }

  protected getProductSelector(): string {
    return 'li.ui-search-layout__item';
  }

  async scrape(): Promise<Product[]> {
    const products: Product[] = [];
    
    try {
      await this.waitForElements(this.getProductSelector(), 5000);
      await this.autoScroll(5);
      
      const productContainers = document.querySelectorAll(this.getProductSelector());
      
      for (const container of productContainers) {
        if (products.length >= this.maxProducts) break;
        
        const titleEl = container.querySelector('.ui-search-item__title');
        const priceEl = container.querySelector('.ui-search-price__second-line .andes-money-amount__fraction');
        const linkEl = container.querySelector('a.ui-search-link');
        const imgEl = container.querySelector('.ui-search-result-image__element');

        if (titleEl && priceEl && linkEl) {
          const title = titleEl.textContent?.trim() || '';
          const priceText = priceEl.textContent?.trim() || '';
          const price = this.parseCurrencyPrice(priceText);
          const url = (linkEl as HTMLAnchorElement).href;
          const imageUrl = (imgEl as HTMLImageElement)?.src || '';

          if (price !== null) {
            const product: Product = {
              id: crypto.randomUUID(),
              title,
              priceNumeric: price,
              imageUrl,
              url,
              site: 'MercadoLibre',
              scrapedAt: Date.now()
            };

            if (!this.isDuplicate(products, product)) {
              products.push(product);
            }
          }
        }
      }
    } catch (error) {
      console.error('[MercadoLibre] Error:', error);
    }
    
    return products;
  }
}
