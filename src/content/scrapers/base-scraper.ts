import { Product, ScrapingUpdate } from '../../types';

export abstract class BaseScraper {
  protected siteName: 'Falabella' | 'MercadoLibre';
  protected keyword: string;
  protected keywordId: string;
  protected maxProducts: number;

  constructor(siteName: 'Falabella' | 'MercadoLibre', keyword: string, keywordId: string, maxProducts: number) {
    this.siteName = siteName;
    this.keyword = keyword;
    this.keywordId = keywordId;
    this.maxProducts = maxProducts;
  }

  /**
   * Ejecuta el proceso completo de scraping.
   */
  abstract scrape(): Promise<Product[]>;

  /**
   * Envía una actualización de progreso al fondo/popup.
   */
  protected reportProgress(progress: number, products?: Product[]) {
    const update: ScrapingUpdate = {
      action: 'SCRAPING_PROGRESS',
      keywordId: this.keywordId,
      site: this.siteName,
      progress,
      products
    };
    chrome.runtime.sendMessage(update);
  }

  /**
   * Utilidad para esperar (scroll o carga dinámica).
   */
  protected wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpia el precio eliminando símbolos y convirtiéndolo a número.
   */
  protected parsePrice(priceText: string): number | null {
    if (!priceText) return null;
    const clean = priceText.replace(/[^\d]/g, '');
    return clean ? parseInt(clean, 10) : null;
  }
}
