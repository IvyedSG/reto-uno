import { BaseScraper } from './base-scraper';
import { Product } from '../../shared/types/product.types';

export class FalabellaScraper extends BaseScraper {
  constructor(keyword: string, keywordId: string, maxProducts: number = 60) {
    super(keyword, keywordId, maxProducts, 'Falabella');
  }

  protected getProductSelector(): string {
    return 'div[id^="testId-search-results"]';
  }

  async scrape(): Promise<Product[]> {
    await this.waitForElements(this.getProductSelector());
    await this.autoScroll(15);

    const productContainers = document.querySelectorAll(this.getProductSelector());
    const products: Product[] = [];

    productContainers.forEach((container) => {
      if (products.length >= this.maxProducts) return;

      const titleEl = container.querySelector('b[id^="testId-pod-display-name"]');
      const priceEl = container.querySelector('ol.pod-prices li.primary span');
      const linkEl = container.querySelector('a[href*="/falabella-pe/product/"]');
      const imgEl = container.querySelector('img.pod-main-image');

      if (titleEl && priceEl && linkEl) {
        const title = titleEl.textContent?.trim() || '';
        const priceText = priceEl.textContent?.trim() || '';
        const price = this.parseCurrencyPrice(priceText);
        const url = (linkEl as HTMLAnchorElement).href;
        const imageUrl = (imgEl as HTMLImageElement)?.src || '';

        if (price !== null) {
          products.push({
            id: crypto.randomUUID(),
            title,
            priceNumeric: price,
            imageUrl,
            url,
            site: 'Falabella',
            scrapedAt: Date.now()
          });
        }
      }
    });

    return products;
  }
}
