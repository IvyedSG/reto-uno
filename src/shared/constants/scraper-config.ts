import { Site, ScrapingMode, ScrapingLimits } from '@/shared/types/scraper.types';

export const SCRAPING_MODES = {
  FAST: 'fast',
  NORMAL: 'normal',
  COMPLETE: 'complete'
} as const;

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
  SCROLL_DELAY: 50,
  PAGE_LOAD: 4000,
  NAVIGATION: 2000,
  BETWEEN_PAGES: 0,
  SCRIPT_INJECTION: 50
} as const;
