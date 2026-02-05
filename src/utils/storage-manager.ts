import { Keyword, KeywordStatus, Product } from '../types';

const STORAGE_KEYS = {
  KEYWORDS: 'keywords',
  PRODUCTS: 'products_'
};

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
   * Guarda los productos scrapeados para una keyword específica
   */
  static async saveProducts(keywordId: string, products: Product[]): Promise<void> {
    await chrome.storage.local.set({
      [`${STORAGE_KEYS.PRODUCTS}${keywordId}`]: products
    });
    
    // Actualiza el contador de productos de la keyword
    await this.updateProductCount(keywordId, products.length);
  }

  /**
   * Obtiene los productos para una keyword específica
   */
  static async getProducts(keywordId: string): Promise<Product[]> {
    const key = `${STORAGE_KEYS.PRODUCTS}${keywordId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || [];
  }
}
