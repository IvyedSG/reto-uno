import { BaseScraper } from '@/content/scrapers/base-scraper';
import { Product } from '@/shared/types/product.types';

export class FalabellaScraper extends BaseScraper {
  constructor(keyword: string, keywordId: string, maxProducts: number = 60) {
    super('Falabella', keyword, keywordId, maxProducts);
  }

  async scrape(): Promise<Product[]> {
    const results: Product[] = [];

    await this.waitForElements('#__NEXT_DATA__', 3000);
    
    const nextDataEl = document.getElementById('__NEXT_DATA__');
    if (!nextDataEl) return [];

    try {
      const data = JSON.parse(nextDataEl.textContent || '{}');
      const products = data.props?.pageProps?.results || [];
      
      products.forEach((p: any, i: number) => {
        if (results.length >= this.maxProducts) return;

        const pricesArr = p.prices || [];
        const mainPriceInfo = pricesArr.find((pr: any) => pr.type === 'eventPrice' || pr.type === 'normalPrice') || pricesArr[0];
        const priceValue = mainPriceInfo?.price?.[0] || 0;
        
        const brand = p.brand || null;
        const title = p.displayName || p.name || "";
        const url = p.url || (p.skuId ? `https://www.falabella.com.pe/falabella-pe/product/${p.skuId}` : "");
        const imageUrl = p.mImage || p.image || (p.media?.[0]?.url) || "";

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

        this.reportProgress(Math.round(((i + 1) / products.length) * 100), results);
      });
    } catch (e) {
      console.error('[Falabella] JSON Parse Error:', e);
    }

    return results;
  }
}
