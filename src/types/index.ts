export enum KeywordStatus {
  IDLE = 'Idle',
  RUNNING = 'Running',
  DONE = 'Done',
  ERROR = 'Error',
  CANCELLED = 'Cancelled'
}

export interface Keyword {
  id: string;
  text: string;
  status: KeywordStatus;
  createdAt: number;
  productCount: number;
}

export interface Product {
  site: 'Falabella' | 'MercadoLibre';
  keyword: string;
  keywordId: string;
  timestamp: number;
  position: number;
  title: string;
  priceVisible: string;
  priceNumeric: number | null;
  url: string;
  brand: string | null;
  seller: string | null;
}

export type Action = 'START_SCRAPING' | 'START_BOTH_SCRAPING' | 'CANCEL_SCRAPING' | 'SCRAPING_PROGRESS' | 'SCRAPING_DONE' | 'SCRAPING_ERROR' | 'OPEN_TAB';

export type Site = 'Falabella' | 'MercadoLibre';

// Scraping modes with configurable limits
export type ScrapingMode = 'fast' | 'normal' | 'complete';

export interface ScrapingLimits {
  falabella: number;
  mercadolibre: number;
  maxPages: { falabella: number; mercadolibre: number };
}

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

export interface ScrapingUpdate {
  action: Action;
  keywordId: string;
  keywordText?: string;
  site?: Site;
  scrapingMode?: ScrapingMode;
  maxProducts?: number;
  maxPages?: number;
  progress?: number;
  products?: Product[];
  error?: string;
}

export const PORT_NAMES = {
  SEARCH: 'search-orchestrator',
  CONTENT: 'content-bridge'
} as const;

export type PortName = typeof PORT_NAMES[keyof typeof PORT_NAMES];

export interface PortMessage {
  type: Action;
  payload: ScrapingUpdate;
}
