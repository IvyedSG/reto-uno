import { BaseScraper } from './base-scraper';
import { Product } from '../../types';
import { isDuplicate } from './scraper-utils';

/**
 * SCRAPER DE MERCADOLIBRE PERU - SINGLE PAGE
 * 
 * Este scraper extrae TODOS los productos de la página actual.
 * La paginación es manejada por el background script que abre
 * múltiples páginas y acumula los productos.
 * 
 * Selectores verificados (Feb 2026):
 * - Cards: li.ui-search-layout__item
 * - Título + Link: a.poly-component__title
 * - Precio: .poly-price__current .andes-money-amount__fraction
 */
export class MeliScraper extends BaseScraper {
  private processedUrls = new Set<string>();

  constructor(keyword: string, keywordId: string) {
    super('MercadoLibre', keyword, keywordId, 100);
  }

  async scrape(): Promise<Product[]> {
    console.log(`[MercadoLibre] === INICIANDO SCRAPING ===`);
    console.log(`[MercadoLibre] URL: ${window.location.href}`);
    
    const results: Product[] = [];
    
    try {
      // Esperar a que la página cargue productos
      await this.waitForProducts();
      
      // Scroll completo para cargar productos lazy-loaded
      await this.scrollEntirePage();
      
      // Extraer todos los productos
      const products = this.extractAllProducts();
      
      // Agregar productos válidos (sin duplicados)
      for (const product of products) {
        if (!this.processedUrls.has(product.url) && !isDuplicate(results, product)) {
          product.position = results.length + 1;
          results.push(product);
          this.processedUrls.add(product.url);
        }
      }
      
      console.log(`[MercadoLibre] Productos extraídos: ${results.length}`);
      
    } catch (error) {
      console.error('[MercadoLibre] Error:', error);
    }
    
    console.log(`[MercadoLibre] === SCRAPING COMPLETADO: ${results.length} productos ===`);
    return results;
  }

  private async waitForProducts(): Promise<void> {
    const maxWait = 8000;
    const interval = 300;
    let waited = 0;
    
    while (waited < maxWait) {
      const cards = document.querySelectorAll('li.ui-search-layout__item');
      if (cards.length > 0) {
        console.log(`[MercadoLibre] Productos encontrados: ${cards.length}`);
        return;
      }
      await this.wait(interval);
      waited += interval;
    }
    
    console.log('[MercadoLibre] Timeout esperando productos');
  }

  private async scrollEntirePage(): Promise<void> {
    console.log('[MercadoLibre] Haciendo scroll...');
    
    const scrollStep = 600;
    let lastScrollTop = 0;
    let sameCount = 0;
    
    while (sameCount < 3) {
      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
      await this.wait(100);
      
      const currentTop = document.documentElement.scrollTop;
      if (currentTop === lastScrollTop) {
        sameCount++;
      } else {
        sameCount = 0;
      }
      lastScrollTop = currentTop;
    }
    
    await this.wait(300);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await this.wait(200);
  }

  private extractAllProducts(): Product[] {
    const products: Product[] = [];
    const cards = document.querySelectorAll('li.ui-search-layout__item');
    
    console.log(`[MercadoLibre] Tarjetas: ${cards.length}`);
    
    for (const card of cards) {
      const product = this.extractProduct(card as HTMLElement);
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  }

  private extractProduct(card: HTMLElement): Product | null {
    const titleLink = card.querySelector('a.poly-component__title') as HTMLAnchorElement;
    if (!titleLink) return null;
    
    const title = titleLink.textContent?.trim() || '';
    const url = titleLink.href || '';
    
    if (!title || !url) return null;
    
    // Precio
    const priceContainer = card.querySelector('.poly-price__current');
    const priceFraction = priceContainer?.querySelector('.andes-money-amount__fraction');
    
    let priceNumeric: number | null = null;
    let priceVisible = 'N/A';
    
    if (priceFraction) {
      const text = priceFraction.textContent?.trim().replace(/\./g, '') || '';
      const num = parseInt(text, 10);
      if (!isNaN(num)) {
        priceNumeric = num;
        priceVisible = `S/ ${num.toLocaleString('es-PE')}`;
      }
    }
    
    return {
      site: 'MercadoLibre',
      keyword: this.keyword,
      keywordId: this.keywordId,
      timestamp: Date.now(),
      position: 0,
      title,
      priceVisible,
      priceNumeric,
      url,
      brand: null,
      seller: null
    };
  }
}
