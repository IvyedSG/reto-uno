import { Keyword, KeywordStatus, Product } from '../types/product.types';

const STORAGE_KEYS = {
  KEYWORDS: 'keywords',
  PRODUCTS: 'products_'
} as const;

let saveLock: Promise<void> = Promise.resolve();

export class StorageManager {
  static async getKeywords(): Promise<Keyword[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.KEYWORDS);
    return result[STORAGE_KEYS.KEYWORDS] || [];
  }

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

  static async updateKeywordStatus(id: string, status: KeywordStatus): Promise<void> {
    const keywords = await this.getKeywords();
    const index = keywords.findIndex(k => k.id === id);
    
    if (index !== -1) {
      keywords[index].status = status;
      await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: keywords });
    }
  }

  static async updateProductCount(id: string, count: number): Promise<void> {
    const keywords = await this.getKeywords();
    const index = keywords.findIndex(k => k.id === id);
    
    if (index !== -1) {
      keywords[index].productCount = count;
      await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: keywords });
    }
  }

  static async markSiteDone(id: string, site: 'Falabella' | 'MercadoLibre'): Promise<void> {
    const keywords = await this.getKeywords();
    const index = keywords.findIndex(k => k.id === id);
    
    if (index !== -1) {
      if (site === 'Falabella') {
        keywords[index].falabellaDone = true;
      } else {
        keywords[index].mercadoLibreDone = true;
      }
      
      if (keywords[index].falabellaDone && keywords[index].mercadoLibreDone) {
        keywords[index].status = KeywordStatus.DONE;
      } else {
        keywords[index].status = KeywordStatus.IDLE;
      }
      
      await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: keywords });
    }
  }

  static async deleteKeyword(id: string): Promise<void> {
    const keywords = await this.getKeywords();
    const updatedKeywords = keywords.filter(k => k.id !== id);
    
    await chrome.storage.local.set({ [STORAGE_KEYS.KEYWORDS]: updatedKeywords });
    await chrome.storage.local.remove(`${STORAGE_KEYS.PRODUCTS}${id}`);
  }

  static async saveProducts(keywordId: string, products: Product[]): Promise<void> {
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

  private static async _saveProductsInternal(keywordId: string, products: Product[]): Promise<void> {
    const key = `${STORAGE_KEYS.PRODUCTS}${keywordId}`;
    const existingProducts = await this.getProducts(keywordId);
    const newSite = products.length > 0 ? products[0].site : null;
    
    const productsFromOtherSite = existingProducts.filter(p => p.site !== newSite);
    const combinedProducts = [...productsFromOtherSite, ...products];
    
    await chrome.storage.local.set({ [key]: combinedProducts });
    await this.updateProductCount(keywordId, combinedProducts.length);
  }

  static async getProducts(keywordId: string): Promise<Product[]> {
    const key = `${STORAGE_KEYS.PRODUCTS}${keywordId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || [];
  }
}
