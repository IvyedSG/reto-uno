import { BaseScraper } from './base-scraper';
import { Product } from '../../types';

export class FalabellaScraper extends BaseScraper {
  /**
   * Selectores con fallbacks - Falabella usa React y cambia frecuentemente
   */
  private readonly SELECTORS = {
    productCards: [
      '.pod-4col',
      '[data-testid="product-card"]',
      '.search-results-4-grid > div',
      '.grid-pod',
      'div[data-pod]',
      '.pod'
    ],
    title: [
      'b.pod-title',
      '.pod-title',
      '[data-testid="product-title"]',
      '.search-result-title',
      '.pod-subTitle'
    ],
    price: [
      '.prices-0',
      '.copy10.primary',
      '[data-testid="product-price"]',
      'span[class*="price"]',
      '.pod-summary-v3 .price-0'
    ],
    link: [
      'a.pod-link',
      'a[href*="/product/"]',
      '.pod-link',
      'a[href*="/falabella-pe/product/"]'
    ],
    nextPage: [
      'button#testId-pagination-top-arrow-right',
      '.pagination-next',
      '[data-testid="pagination-next"]'
    ]
  };

  constructor(keyword: string, keywordId: string) {
    super('Falabella', keyword, keywordId, 60);
  }

  async scrape(): Promise<Product[]> {
    console.log(`[FalabellaScraper] Iniciando scraping para: ${this.keyword}`);
    const results: Product[] = [];
    let attempts = 0;
    const maxAttempts = 15;

    while (results.length < this.maxProducts && attempts < maxAttempts) {
      await this.wait(2000); 
      
      const cards = this.findElements(this.SELECTORS.productCards);
      console.log(`[FalabellaScraper] Encontradas ${cards.length} cards`);
      
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
          console.log(`[FalabellaScraper] Producto ${results.length}: ${product.title.substring(0, 30)}... - ${product.priceVisible}`);
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

    console.log(`[FalabellaScraper] Scraping completo: ${results.length} productos`);
    return results;
  }

  private extractProduct(card: HTMLElement, position: number): Product | null {
    const titleEl = this.findElement(card, this.SELECTORS.title);
    const priceEl = this.findElement(card, this.SELECTORS.price);
    const linkEl = this.findElement(card, this.SELECTORS.link) as HTMLAnchorElement;

    if (!titleEl) return null;

    const title = titleEl?.textContent?.trim() || '';
    const url = linkEl?.href || '';

    if (!title || !url) return null;

    // Falabella Peru: precios como "S/ 1.820" (dot = thousands) o "S/99.90" (dot = decimal)
    // Logic: if there's a dot and only 2 digits after, treat as decimal, otherwise as thousand separator
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
      brand: null,
      seller: null
    };
  }

  /**
   * Parsea precios de Falabella Peru.
   * Formatos posibles:
   * - "S/ 1.820" -> 1820 (dot as thousand separator)
   * - "S/99.90" -> 99.90 -> 99 (dot as decimal)
   * - "S/ 99" -> 99
   * - "1820" -> 1820
   */
  private parseFalabellaPrice(priceText: string): number | null {
    if (!priceText) return null;
    
    // Remove currency symbols and spaces
    let clean = priceText.replace(/S\/\s*/gi, '').trim();
    
    // If empty after cleaning, return null
    if (!clean) return null;
    
    // Check if it has decimals (dot followed by exactly 2 digits at the end)
    const decimalMatch = clean.match(/^([\d.]+)[,.](\d{2})$/);
    if (decimalMatch) {
      // Remove thousand separators (dots) from the integer part
      const integerPart = decimalMatch[1].replace(/\./g, '');
      // Return as integer (ignoring cents for comparison purposes)
      return parseInt(integerPart, 10);
    }
    
    // No decimals - just remove all dots (they're thousand separators)
    const cleaned = clean.replace(/\./g, '').replace(/,/g, '');
    const result = parseInt(cleaned, 10);
    
    return isNaN(result) ? null : result;
  }

  private findElements(selectors: string[]): Element[] {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`[FalabellaScraper] Usando selector: ${selector} (${elements.length} elementos)`);
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
      const nextBtn = document.querySelector(selector) as HTMLElement;
      if (nextBtn && !nextBtn.hasAttribute('disabled')) {
        console.log('[FalabellaScraper] Navegando a siguiente página...');
        nextBtn.click();
        await this.wait(3000); 
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
    await this.wait(1500);
  }
}
