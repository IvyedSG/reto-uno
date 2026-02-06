import { Keyword, KeywordStatus, Product } from '../types';

const STORAGE_KEYS = {
  KEYWORDS: 'keywords',
  PRODUCTS: 'products_'
};

// Mutex para serializar operaciones de guardado y evitar race conditions
let saveLock: Promise<void> = Promise.resolve();

export class StorageManager {
  /**
   * Obtiene todas las keywords del almacenamiento
   */
  static async getKeywords(): Promise<Keyword[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.KEYWORDS);
    return result[STORAGE_KEYS.KEYWORDS] || [];
  }

  /**
   * Agrega una nueva keyword al almacenamiento
   */
  static async addKeyword(text: string): Promise<Keyword> {
    const keywords = await this.getKeywords();
    const newKeyword: Keyword = {
      id: crypto.randomUUID(),
      text,
      status: KeywordStatus.IDLE,
      createdAt: Date.now(),
      productCount: 0
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.KEYWORDS]: [...keywords, newKeyword]
    });

    return newKeyword;
  }

  /**
   * Actualiza el estado de una keyword existente
   */
  static async updateKeywordStatus(id: string, status: KeywordStatus): Promise<void> {
    const keywords = await this.getKeywords();
    const index = keywords.findIndex(k => k.id === id);
    
    if (index !== -1) {
      keywords[index].status = status;
      await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: keywords });
    }
  }

  /**
   * Actualiza el contador de productos de una keyword existente
   */
  static async updateProductCount(id: string, count: number): Promise<void> {
    const keywords = await this.getKeywords();
    const index = keywords.findIndex(k => k.id === id);
    
    if (index !== -1) {
      keywords[index].productCount = count;
      await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: keywords });
    }
  }

  /**
   * Elimina una keyword y sus productos asociados
   */
  static async deleteKeyword(id: string): Promise<void> {
    const keywords = await this.getKeywords();
    const updatedKeywords = keywords.filter(k => k.id !== id);
    
    await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: updatedKeywords });
    await chrome.storage.local.remove(`${STORAGE_KEYS.PRODUCTS}${id}`);
  }

  /**
   * Guarda los productos scrapeados para una keyword específica.
   * Usa un mutex para evitar race conditions cuando ambos sitios terminan casi al mismo tiempo.
   */
  static async saveProducts(keywordId: string, products: Product[]): Promise<void> {
    // Esperar a que termine cualquier operación anterior
    const previousLock = saveLock;
    let releaseLock: () => void;
    saveLock = new Promise(resolve => { releaseLock = resolve; });
    
    await previousLock;
    
    try {
      await this._saveProductsInternal(keywordId, products);
    } finally {
      releaseLock!();
    }
  }

  /**
   * Implementación interna de saveProducts (serializada por el mutex)
   */
  private static async _saveProductsInternal(keywordId: string, products: Product[]): Promise<void> {
    const key = `${STORAGE_KEYS.PRODUCTS}${keywordId}`;
    
    const existingProducts = await this.getProducts(keywordId);
    const newSite = products.length > 0 ? products[0].site : null;
    
    // Mantener productos de otros sitios y agregar los nuevos
    const productsFromOtherSite = existingProducts.filter(p => p.site !== newSite);
    const combinedProducts = [...productsFromOtherSite, ...products];
    
    await chrome.storage.local.set({ [key]: combinedProducts });
    await this.updateProductCount(keywordId, combinedProducts.length);
  }

  /**
   * Obtiene los productos para una keyword específica
   */
  static async getProducts(keywordId: string): Promise<Product[]> {
    const key = `${STORAGE_KEYS.PRODUCTS}${keywordId}`;
    const result = await chrome.storage.local.get(key);
    const products = result[key] || [];
    return products;
  }
}
