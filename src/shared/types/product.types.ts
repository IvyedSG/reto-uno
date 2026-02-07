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
  id: string;
  title: string;
  priceNumeric: number | null;
  imageUrl: string;
  url: string;
  site: 'Falabella' | 'MercadoLibre';
  scrapedAt: number;
}
