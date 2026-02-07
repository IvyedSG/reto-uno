/**
 * Product-related types and enums
 */

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
  falabellaDone?: boolean;
  mercadoLibreDone?: boolean;
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
