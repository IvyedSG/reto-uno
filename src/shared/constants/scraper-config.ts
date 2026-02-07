import { Site, ScrapingMode, ScrapingLimits } from '../types/scraper.types';

/**
 * Scraper Configuration Constants
 */

export const SCRAPING_MODES = {
  FAST: 'fast',
  NORMAL: 'normal',
  COMPLETE: 'complete'
} as const;

/**
 * Search URL generators for each supported site
 */
export const SEARCH_URLS: Record<Site, (keyword: string, page?: number) => string> = {
  Falabella: (kw, page = 1) => {
    const base = `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodeURIComponent(kw)}`;
    if (page === 1) return base;
    return `${base}&page=${page}`;
  },
  MercadoLibre: (kw, page = 1) => {
    const base = `https://listado.mercadolibre.com.pe/${encodeURIComponent(kw.replace(/ /g, '-'))}`;
    if (page === 1) return base;
    const offset = (page - 1) * 48 + 1;
    return `${base}_Desde_${offset}_NoIndex_True`;
  }
};

/**
 * Scraping limits per mode and site.
 * Moved from shared/types/scraper.types.ts to keep config centralized.
 */
export const SCRAPING_LIMITS: Record<ScrapingMode, ScrapingLimits> = {
  fast: { 
    falabella: 60, 
    mercadolibre: 100,
    maxPages: { falabella: 3, mercadolibre: 3 }
  },
  normal: { 
    falabella: 120, 
    mercadolibre: 200,
    maxPages: { falabella: 5, mercadolibre: 5 }
  },
  complete: { 
    falabella: 200, 
    mercadolibre: 350,
    maxPages: { falabella: 8, mercadolibre: 8 }
  }
};

export const TIMEOUTS = {
  SCROLL_DELAY: 250,
  PAGE_LOAD: 8000,
  NAVIGATION: 5000,
  BETWEEN_PAGES: 3000,
  SCRIPT_INJECTION: 1000
} as const;
