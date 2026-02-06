import { Product } from '../../types';

/**
 * Busca elementos usando una lista de selectores con fallback.
 * Retorna los elementos del primer selector que coincida.
 */
export function findElements(selectors: string[], logPrefix = '[Scraper]'): Element[] {
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${logPrefix} Selector: ${selector} (${elements.length})`);
      return Array.from(elements);
    }
  }
  return [];
}

/**
 * Busca un elemento dentro de un padre usando selectores con fallback.
 */
export function findElement(parent: HTMLElement, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = parent.querySelector(selector);
    if (element) return element;
  }
  return null;
}

/**
 * Verifica si un producto ya existe en la lista por URL.
 */
export function isDuplicate(products: Product[], product: Product): boolean {
  return products.some(p => p.url === product.url);
}
