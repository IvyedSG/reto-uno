/**
 * Message-related types for extension communication
 */

import type { Product } from './product.types';
import type { Site, ScrapingMode } from './scraper.types';
export type { Site, ScrapingMode };

export type Action = 
  | 'START_SCRAPING' 
  | 'START_BOTH_SCRAPING' 
  | 'CANCEL_SCRAPING' 
  | 'SCRAPING_PROGRESS' 
  | 'SCRAPING_DONE' 
  | 'SCRAPING_ERROR' 
  | 'OPEN_TAB';

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
