import { BaseScraper } from '@/content/scrapers/base-scraper';
import { Product } from '@/shared/types/product.types';

export class FalabellaScraper extends BaseScraper {
  constructor(keyword: string, keywordId: string, maxProducts: number = 60) {
    super('Falabella', keyword, keywordId, maxProducts);
  }

  async scrape(): Promise<Product[]> {
    const results: Product[] = [];

    console.log('[Falabella] Esperando resultados o indicador de "Sin resultados"...');
    
    const found = await this.waitForElements(
      '#search-results-9, .pod-module, #__NEXT_DATA__', 
      5000,
      '#search-rescue-title, .search-not-found, .no-results-message'
    );

    if (!found) {
      console.warn('[Falabella] No se encontraron resultados o se detectó una página vacía/error.');
      return [];
    }
    
    const nextDataEl = document.getElementById('__NEXT_DATA__');
    if (!nextDataEl) {
      console.warn('[Falabella] No se encontró el script de datos __NEXT_DATA__.');
      return [];
    }

    try {
      const textContent = nextDataEl.textContent || '{}';
      const data = JSON.parse(textContent);
      
      const products = data.props?.pageProps?.results || 
                       data.props?.pageProps?.searchResponse?.results || [];
      
      if (products.length === 0) {
        console.log('[Falabella] El JSON no contiene resultados de productos.');
      }

      products.forEach((p: any, i: number) => {
        if (!p || results.length >= this.maxProducts) return;

        const pricesArr = p.prices || [];
        const mainPriceInfo = pricesArr.find((pr: any) => pr && (pr.type === 'eventPrice' || pr.type === 'normalPrice')) || pricesArr[0];
        const priceValue = mainPriceInfo?.price?.[0] || 0;
        
        const brand = p.brand || null;
        const title = p.displayName || p.name || "";
        const url = p.url || (p.skuId ? `https://www.falabella.com.pe/falabella-pe/product/${p.skuId}` : "");
        const imageUrl = p.mImage || p.image || (p.media?.[0]?.url) || "";

        if (title && priceValue) {
          results.push({
            id: crypto.randomUUID(),
            title: title,
            priceVisible: `S/ ${priceValue}`,
            priceNumeric: typeof priceValue === 'number' ? priceValue : this.parseCurrencyPrice(String(priceValue)) || 0,
            imageUrl: imageUrl,
            url: url,
            site: 'Falabella',
            scrapedAt: Date.now(),
            position: i + 1,
            brand: brand,
            seller: p.sellerName || null
          });
        }

        this.reportProgress(Math.round(((i + 1) / products.length) * 100), results);
      });
      
      console.log(`[Falabella] Extracción finalizada: ${results.length} productos válidos`);
    } catch (e) {
      console.error('[Falabella] Error procesando datos:', e);
    }

    return results;
  }
}
