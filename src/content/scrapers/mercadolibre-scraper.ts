import { BaseScraper } from '@/content/scrapers/base-scraper';
import { Product } from '@/shared/types/product.types';

export class MercadoLibreScraper extends BaseScraper {

  constructor(keyword: string, keywordId: string, maxProducts: number = 100) {
    super('MercadoLibre', keyword, keywordId, maxProducts);
  }

  async scrape(): Promise<Product[]> {
    const results: Product[] = [];
    
    try {
      const candidates: string[] = [];
      const nordicScript = document.getElementById('__NORDIC_RENDERING_CTX__');
      if (nordicScript) {
        candidates.push(nordicScript.textContent || '');
      }

      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent || '';
        if (text.includes('_n.ctx.r') || text.includes('__PRELOADED_STATE__')) {
          if (!candidates.includes(text)) {
            candidates.push(text);
          }
        }
      }

      candidates.sort((a, b) => b.length - a.length);

      let data: any = null;
      for (const text of candidates) {
        const jsonStart = text.indexOf('{');
        if (jsonStart === -1) continue;

        const terminators = ['};', '}', '];']; 
        let parsed = null;

        for (const term of terminators) {
          const jsonEnd = term === '}' ? text.lastIndexOf('}') : text.indexOf(term, jsonStart);
          if (jsonEnd === -1) continue;

          try {
            parsed = JSON.parse(text.substring(jsonStart, jsonEnd + (term === '}' ? 1 : 1))); 
            if (parsed) break;
          } catch (e) {}
        }

        if (parsed) {
          data = parsed;
          console.log('[MercadoLibre] Datos extraídos satisfactoriamente de un candidato.');
          break;
        }
      }

      if (data) {
        let items = data.appProps?.pageProps?.initialState?.results;

        if (!Array.isArray(items)) {
          console.log('[MercadoLibre] Iniciando búsqueda recursiva de resultados...');
          const findResultsArray = (obj: any, depth = 0): any[] | null => {
            if (depth > 30 || !obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj) && obj.length > 5) {
              const hasPoly = obj.some(it => it && (it.id === 'POLYCARD' || it.type === 'item'));
              if (hasPoly) return obj;
            }
            for (const key in obj) {
              const res = findResultsArray(obj[key], depth + 1);
              if (res) return res;
            }
            return null;
          };
          items = findResultsArray(data);
        }

        if (items && Array.isArray(items)) {
          console.log(`[MercadoLibre] Procesando ${items.length} items potenciales`);

          items.forEach((item: any, i: number) => {
            if (results.length >= this.maxProducts) return;
            
            const polyData = item.polycard || item;
            const components = polyData.components || item.components || [];
            const metadata = polyData.metadata || item.metadata || {};
            
            const titleComp = components.find((c: any) => c.id === 'title' || c.type === 'title');
            const priceComp = components.find((c: any) => c.id === 'price' || c.type === 'price');
            const sellerComp = components.find((c: any) => c.id === 'seller' || c.type === 'seller');
            
            const title = titleComp?.title?.text || metadata.title || item.title || '';
            const priceValue = priceComp?.price?.current_price?.value || 0;
            const url = metadata.url || item.permalink || '';
            
            let imageUrl = item.thumbnail || '';
            if (item.pictures?.pictures?.[0]?.url) {
              imageUrl = item.pictures.pictures[0].url;
            } else if (item.pictures?.pictures?.[0]?.id) {
              imageUrl = `https://http2.mlstatic.com/D_NQ_NP_${item.pictures.pictures[0].id}-W.webp`;
            }

            if (title && priceValue > 0) {
              results.push({
                id: crypto.randomUUID(),
                title: title,
                priceVisible: `S/ ${priceValue}`,
                priceNumeric: priceValue,
                imageUrl: imageUrl,
                url: url.startsWith('http') ? url : (url ? `https://www.mercadolibre.com.pe${url.startsWith('/') ? '' : '/'}${url}` : ''),
                site: 'MercadoLibre',
                scrapedAt: Date.now(),
                position: i + 1,
                seller: sellerComp?.seller?.text?.replace(/{icon_cockade}/g, '').trim() || item.seller?.nickname || null
              });
            }
            
            this.reportProgress(Math.round(((i + 1) / items.length) * 100), results);
          });
          
          console.log(`[MercadoLibre] Extracción finalizada: ${results.length} productos válidos`);
        }
      }
      
      if (results.length === 0) {
        console.warn('[MercadoLibre] No se encontraron resultados válidos en la página.');
      }
    } catch (error) {
      console.error('[MercadoLibre] Scraping Error:', error);
    }
    
    return results;
  }
}
