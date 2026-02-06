import { BaseScraper } from './base-scraper';
import { Product } from '../../types';
import { isDuplicate } from './scraper-utils';

export class FalabellaScraper extends BaseScraper {
  /**
   * Selectores verificados por análisis de browser (Feb 2026):
   * - Cards: .pod-link (son <a> tags directamente)
   * - Brand: b.pod-title
   * - Product name: b.pod-subTitle
   * - Price: li.prices-0 span.copy10
   * - Pagination: #testId-pagination-bottom-arrow-right
   */
  private readonly SELECTORS = {
    productCards: [
      'a.pod-link',
      '.pod-link'
    ],
    brand: [
      'b.pod-title',
      '.pod-title'
    ],
    productName: [
      'b.pod-subTitle',
      '.pod-subTitle',
      '.pod-description'
    ],
    price: [
      'li.prices-0 span.copy10',
      'li.prices-0 span',
      '.prices-0',
      '.copy10.primary'
    ],
    nextPage: [
      '#testId-pagination-bottom-arrow-right',
      'button#testId-pagination-top-arrow-right'
    ]
  };

  constructor(keyword: string, keywordId: string) {
    super('Falabella', keyword, keywordId, 60);
  }

  async scrape(): Promise<Product[]> {
    console.log(`[Falabella] Iniciando scraping: ${this.keyword}`);
    const results: Product[] = [];
    let attempts = 0;
    const maxAttempts = 20;
    let pagesVisited = 0;
    const maxPages = 3;

    while (results.length < this.maxProducts && attempts < maxAttempts && pagesVisited < maxPages) {
      // Scroll para cargar productos lazy-loaded
      await this.scrollFullPage();
      await this.wait(2000);
      
      const cards = this.findCards();
      console.log(`[Falabella] Encontradas ${cards.length} tarjetas en página ${pagesVisited + 1}`);
      
      if (cards.length === 0) {
        attempts++;
        if (attempts >= 3) {
          console.log('[Falabella] No se encontraron tarjetas después de 3 intentos');
          break;
        }
        continue;
      }

      const previousCount = results.length;

      for (const card of cards) {
        if (results.length >= this.maxProducts) break;
        
        const product = this.extractProduct(card as HTMLAnchorElement, results.length + 1);
        if (product && !isDuplicate(results, product)) {
          results.push(product);
        }
      }

      console.log(`[Falabella] Extraídos ${results.length} productos hasta ahora`);
      
      const progress = Math.min(Math.round((results.length / this.maxProducts) * 100), 100);
      this.reportProgress(progress, results);

      // Si no encontramos nuevos productos y ya tenemos algunos, intentar paginación
      if (results.length === previousCount && results.length > 0) {
        attempts++;
      }
      
      // Intentar ir a la siguiente página
      if (results.length < this.maxProducts) {
        const navigated = await this.tryNextPage();
        if (navigated) {
          pagesVisited++;
          attempts = 0;
          console.log(`[Falabella] Navegando a página ${pagesVisited + 1}`);
          await this.wait(3000);
        } else if (results.length === previousCount) {
          console.log('[Falabella] No hay más páginas disponibles');
          break;
        }
      }
    }

    console.log(`[Falabella] Scraping completado: ${results.length} productos`);
    return results;
  }

  private findCards(): Element[] {
    for (const selector of this.SELECTORS.productCards) {
      const cards = document.querySelectorAll(selector);
      if (cards.length > 0) {
        return Array.from(cards);
      }
    }
    return [];
  }

  private findElement(parent: HTMLElement, selectors: string[]): Element | null {
    for (const selector of selectors) {
      const el = parent.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  private extractProduct(card: HTMLAnchorElement, position: number): Product | null {
    // El card es un <a> tag, así que ya tiene el href
    const url = card.href || '';
    
    // Buscar marca y nombre del producto
    const brandEl = this.findElement(card, this.SELECTORS.brand);
    const nameEl = this.findElement(card, this.SELECTORS.productName);
    const priceEl = this.findElement(card, this.SELECTORS.price);

    const brand = brandEl?.textContent?.trim() || '';
    const productName = nameEl?.textContent?.trim() || '';
    
    // Combinar marca y nombre para título completo
    const title = productName || brand || '';
    
    if (!title || !url) return null;

    const priceRaw = priceEl?.textContent?.trim() || '';
    const priceNumeric = this.parseFalabellaPrice(priceRaw);

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

  /**
   * Parsea precios de Falabella Peru.
   * Formato: S/ 1,699.00 (coma = miles, punto = decimal)
   * Ejemplo: "S/ 29.90" -> 30, "S/ 1,299.00" -> 1299
   */
  private parseFalabellaPrice(priceText: string): number | null {
    if (!priceText) return null;
    
    // Remover "S/" y espacios
    let clean = priceText.replace(/S\/\s*/gi, '').trim();
    if (!clean) return null;
    
    // Formato Falabella: 1,699.00 (coma = miles, punto = decimal)
    // Remover comas (separador de miles)
    clean = clean.replace(/,/g, '');
    
    // Parsear como float y redondear a entero
    const num = parseFloat(clean);
    
    return isNaN(num) ? null : Math.round(num);
  }

  private async tryNextPage(): Promise<boolean> {
    for (const selector of this.SELECTORS.nextPage) {
      const nextBtn = document.querySelector(selector) as HTMLElement;
      if (nextBtn && !nextBtn.hasAttribute('disabled') && !nextBtn.classList.contains('disabled')) {
        nextBtn.click();
        return true;
      }
    }
    return false;
  }

  private async scrollFullPage(): Promise<void> {
    const totalHeight = document.documentElement.scrollHeight;
    const step = window.innerHeight;
    
    for (let pos = 0; pos < totalHeight; pos += step) {
      window.scrollTo({ top: pos, behavior: 'smooth' });
      await this.wait(250);
    }
    
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    await this.wait(500);
  }
}
