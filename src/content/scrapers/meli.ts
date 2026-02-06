import { BaseScraper } from './base-scraper';
import { Product } from '../../types';

export class MeliScraper extends BaseScraper {
  /**
   * Selectores con fallbacks - MercadoLibre cambia su HTML frecuentemente
   */
  private readonly SELECTORS = {
    productCards: [
      'li.ui-search-layout__item',
      '.ui-search-result__wrapper',
      '.ui-search-result',
      '.poly-card__content'
    ],
    title: [
      'a.poly-component__title',
      '.ui-search-item__title',
      'h2.ui-search-item__title',
      '.poly-component__title-wrapper a'
    ],
    price: [
      '.poly-price__current .andes-money-amount__fraction',
      '.andes-money-amount__fraction',
      '.price-tag-fraction'
    ],
    link: [
      'a.poly-component__title',
      'a.ui-search-link',
      'a.ui-search-result__content',
      'a[href*="/p/"]'
    ],
    nextPage: [
      'a.andes-pagination__link[title="Siguiente"]',
      'a[title="Siguiente"]',
      '.andes-pagination__button--next a'
    ]
  };

  constructor(keyword: string, keywordId: string) {
    super('MercadoLibre', keyword, keywordId, 100);
  }

  async scrape(): Promise<Product[]> {
    console.log(`🔍 [MeliScraper] Iniciando scraping para: ${this.keyword}`);
    const results: Product[] = [];
    let attempts = 0;
    const maxAttempts = 20;

    while (results.length < this.maxProducts && attempts < maxAttempts) {
      await this.wait(1500);
      
      const cards = this.findElements(this.SELECTORS.productCards);
      console.log(`[MeliScraper] Encontradas ${cards.length} cards`);
      
      if (cards.length === 0) {
        attempts++;
        await this.scrollToLoadMore();
        continue;
      }

      const previousCount = results.length;

      for (const card of cards) {
        if (results.length >= this.maxProducts) break;
        
        const product = this.extractProduct(card as HTMLElement, results.length + 1);
        if (product && !this.isDuplicate(results, product)) {
          results.push(product);
          console.log(`[MeliScraper] Producto ${results.length}: ${product.title.substring(0, 30)}...`);
        }
      }

      const progress = Math.min(Math.round((results.length / this.maxProducts) * 100), 100);
      this.reportProgress(progress, results);

      if (results.length === previousCount) {
        attempts++;
        const navigated = await this.tryNextPage();
        if (!navigated) {
          await this.scrollToLoadMore();
        }
      } else {
        attempts = 0;
      }
    }

    console.log(`✅ [MeliScraper] Scraping completo: ${results.length} productos`);
    return results;
  }

  private extractProduct(card: HTMLElement, position: number): Product | null {
    const titleEl = this.findElement(card, this.SELECTORS.title) as HTMLAnchorElement;
    const priceEl = this.findElement(card, this.SELECTORS.price);
    const linkEl = this.findElement(card, this.SELECTORS.link) as HTMLAnchorElement;

    if (!titleEl && !linkEl) return null;

    const title = titleEl?.textContent?.trim() || '';
    const priceText = priceEl?.textContent?.replace(/\./g, '') || '';
    const url = linkEl?.href || titleEl?.href || '';

    if (!title || !url) return null;

    return {
      site: 'MercadoLibre',
      keyword: this.keyword,
      keywordId: this.keywordId,
      timestamp: Date.now(),
      position,
      title,
      priceVisible: priceEl ? `S/ ${priceEl.textContent}` : 'N/A',
      priceNumeric: this.parsePrice(priceText),
      url,
      brand: null,
      seller: null
    };
  }

  private findElements(selectors: string[]): Element[] {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`[MeliScraper] Usando selector: ${selector} (${elements.length} elementos)`);
        return Array.from(elements);
      }
    }
    return [];
  }

  private findElement(parent: HTMLElement, selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = parent.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  private isDuplicate(products: Product[], product: Product): boolean {
    return products.some(p => p.url === product.url);
  }

  private async tryNextPage(): Promise<boolean> {
    for (const selector of this.SELECTORS.nextPage) {
      const nextBtn = document.querySelector(selector) as HTMLAnchorElement;
      if (nextBtn) {
        console.log('[MeliScraper] Navegando a siguiente página...');
        nextBtn.click();
        await this.wait(2500);
        return true;
      }
    }
    return false;
  }

  private async scrollToLoadMore(): Promise<void> {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
    await this.wait(1000);
  }
}
