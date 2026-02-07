export type Site = 'Falabella' | 'MercadoLibre';

export type ScrapingMode = 'fast' | 'normal' | 'complete';

export interface ScrapingLimits {
  falabella: number;
  mercadolibre: number;
  maxPages: { falabella: number; mercadolibre: number };
}
