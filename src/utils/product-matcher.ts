import { Product } from '../types';

export interface ProductGroup {
  id: string;
  name: string;
  products: Product[];
  stats: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    meliCount: number;
    falabellaCount: number;
  };
}

/**
 * Utilidades para comparar títulos y precios y agrupar productos similares.
 */
export class ProductMatcher {
  /**
   * Agrupa productos basándose en la similitud de sus títulos y proximidad de precio.
   */
  static groupSimilarProducts(products: Product[]): ProductGroup[] {
    const groups: ProductGroup[] = [];

    products.forEach(product => {
      let bestGroup: ProductGroup | null = null;
      let maxSimilarity = 0;

      for (const group of groups) {
        const similarity = this.calculateSimilarity(product.title, group.name);
        if (similarity > 0.8) { 
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestGroup = group;
          }
        }
      }

      if (bestGroup) {
        bestGroup.products.push(product);
      } else {
        groups.push({
          id: Math.random().toString(36).substr(2, 9),
          name: product.title,
          products: [product],
          stats: { minPrice: 0, maxPrice: 0, avgPrice: 0, meliCount: 0, falabellaCount: 0 }
        });
      }
    });

    return this.calculateStatsForGroups(groups);
  }

  private static calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - this.editDistance(longer.toLowerCase(), shorter.toLowerCase())) / longer.length;
  }

  private static editDistance(s1: string, s2: string): number {
    const costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private static calculateStatsForGroups(groups: ProductGroup[]): ProductGroup[] {
    return groups.map(group => {
      const prices = group.products
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null);

      group.stats = {
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        meliCount: group.products.filter(p => p.site === 'MercadoLibre').length,
        falabellaCount: group.products.filter(p => p.site === 'Falabella').length
      };
      
      return group;
    });
  }
}
