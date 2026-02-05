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

export type Action = 'START_SCRAPING' | 'CANCEL_SCRAPING' | 'SCRAPING_PROGRESS' | 'SCRAPING_DONE' | 'SCRAPING_ERROR';

export interface ScrapingUpdate {
  action: Action;
  keywordId: string;
  progress?: number;
  products?: Product[];
  error?: string;
}

export const PORT_NAMES = {
  SEARCH: 'search-orchestrator'
};
