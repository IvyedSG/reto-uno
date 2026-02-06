import { BaseScraper } from './base-scraper';
import { Product } from '../../types';

export class MeliScraper extends BaseScraper {
  /**
   * Selectores actualizados para MercadoLibre Peru (2025)
   * - .poly-card es el contenedor moderno
   * - .poly-component__title es el título y link
   * - .andes-money-amount__fraction es el precio
   */
  private readonly SELECTORS = {
    productCards: [
      '.poly-card',
      'li.ui-search-layout__item',
      '.ui-search-result__wrapper'
    ],
    title: [
      '.poly-component__title',
      'a.poly-component__title',
      '.ui-search-item__title'
    ],
    price: [
      '.andes-money-amount__fraction',
      '.poly-price__current .andes-money-amount__fraction',
      '.price-tag-fraction'
    ],
    link: [
      'a.poly-component__title',
      'a.ui-search-link',
      'a[href*="/p/"]'
    ]
  };

  constructor(keyword: string, keywordId: string) {
    // Limitar a 50 productos ya que no podemos navegar entre páginas
    // (navegar destruye el content script)
    super('MercadoLibre', keyword, keywordId, 50);
  }

  async scrape(): Promise<Product[]> {
    console.log(`[MeliScraper] Iniciando scraping para: ${this.keyword}`);
    const results: Product[] = [];
    let attempts = 0;
    const maxAttempts = 5; // Reducido: no navegamos páginas, solo scroll

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
          console.log(`[MeliScraper] Producto ${results.length}: ${product.title.substring(0, 30)}... - ${product.priceVisible}`);
        }
      }

      const progress = Math.min(Math.round((results.length / this.maxProducts) * 100), 100);
      this.reportProgress(progress, results);

      if (results.length === previousCount) {
        // No se encontraron más productos nuevos, intentar scroll
        attempts++;
        await this.scrollToLoadMore();
        
        // Si después del scroll sigue igual, terminamos
        // NO navegamos a otra página porque eso mata el content script
        console.log(`[MeliScraper] Sin nuevos productos, intento ${attempts}/${maxAttempts}`);
      } else {
        attempts = 0;
      }
    }

    console.log(`[MeliScraper] Scraping completo: ${results.length} productos`);
    return results;
  }

  private extractProduct(card: HTMLElement, position: number): Product | null {
    const titleEl = this.findElement(card, this.SELECTORS.title) as HTMLAnchorElement;
    const priceEl = this.findElement(card, this.SELECTORS.price);
    const linkEl = this.findElement(card, this.SELECTORS.link) as HTMLAnchorElement;

    if (!titleEl && !linkEl) return null;

    const title = titleEl?.textContent?.trim() || '';
    const url = linkEl?.href || titleEl?.href || '';

    if (!title || !url) return null;

    // MercadoLibre Peru: precio como "3.469" (dots = thousands) o "578,17" (comma = decimals)
    // El elemento .andes-money-amount__fraction solo tiene la parte entera
    const priceText = priceEl?.textContent?.trim() || '';
    // Quitar dots de miles para parsear correctamente
    const priceCleaned = priceText.replace(/\./g, '');
    const priceNumeric = priceCleaned ? parseInt(priceCleaned, 10) : null;

    return {
      site: 'MercadoLibre',
      keyword: this.keyword,
      keywordId: this.keywordId,
      timestamp: Date.now(),
      position,
      title,
      priceVisible: priceNumeric ? `S/ ${priceNumeric.toLocaleString('es-PE')}` : 'N/A',
      priceNumeric,
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

  private async scrollToLoadMore(): Promise<void> {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
    await this.wait(1000);
  }
}
