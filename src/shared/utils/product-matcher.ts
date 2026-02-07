import { Product } from '@/shared/types/product.types';

export interface SiteStats {
  count: number;
  min: number;
  max: number;
  avg: number;
}

export interface GroupStats {
  min: number;
  max: number;
  avg: number;
  falabella: SiteStats;
  meli: SiteStats;
  savings: number | null;
  cheaperSite: 'Falabella' | 'MercadoLibre' | null;
  meliCount: number;
  falabellaCount: number;
  priceDiff: number | null;
}

export interface ProductGroup {
  id: string;
  name: string;
  products: Product[];
  stats: GroupStats;
}

export class ProductMatcher {
  private static readonly STOPWORDS = new Set([
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'con',
    'para', 'por', 'a', 'al', 'del', 'es', 'que', 'se', 'su', 'sus', 'the', 'and', 'or',
    'of', 'to', 'in', 'for', 'with', 'on', 'at', 'from', 'by', 'color', 'colores',
    'pack', 'set', 'kit', 'x', 'pcs', 'unidad', 'unidades', 'nuevo', 'new', 'original'
  ]);

  static groupSimilarProducts(products: Product[]): ProductGroup[] {
    const groups: ProductGroup[] = [];

    const sortedProducts = [...products].sort((a, b) => 
      (a.priceNumeric ?? Infinity) - (b.priceNumeric ?? Infinity)
    );

    for (const product of sortedProducts) {
      const productTokens = this.extractTokens(product.title);
      let bestGroup: ProductGroup | null = null;
      let bestScore = 0;

      for (const group of groups) {
        const groupTokens = this.extractTokens(group.name);
        const score = this.calculateTokenSimilarity(productTokens, groupTokens);
        
        if (score > 0.5 && score > bestScore) {
          bestScore = score;
          bestGroup = group;
        }
      }

      if (bestGroup) {
        bestGroup.products.push(product);
      } else {
        groups.push({
          id: crypto.randomUUID().substring(0, 8),
          name: product.title,
          products: [product],
          stats: this.createEmptyGroupStats()
        });
      }
    }

    const groupsWithStats = this.calculateStatsForGroups(groups);
    
    const crossSiteGroups = groupsWithStats.filter(g => 
      g.stats.meliCount > 0 && g.stats.falabellaCount > 0
    );

    return crossSiteGroups.sort((a, b) => {
      const savingsA = a.stats.savings ?? 0;
      const savingsB = b.stats.savings ?? 0;
      return savingsB - savingsA;
    });
  }

  private static extractTokens(title: string): Set<string> {
    const normalized = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
      .filter(t => !this.STOPWORDS.has(t));
    
    return new Set(normalized);
  }

  private static calculateTokenSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    let intersection = 0;
    for (const token of tokens1) {
      if (tokens2.has(token)) intersection++;
    }
    
    const union = tokens1.size + tokens2.size - intersection;
    return intersection / union;
  }

  static calculateSiteStats(products: Product[]): SiteStats | null {
    const prices = products
      .map(p => p.priceNumeric)
      .filter((p): p is number => p !== null && p > 0);
    
    if (prices.length === 0) return null;
    
    return {
      count: products.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    };
  }

  private static calculateStatsForGroups(groups: ProductGroup[]): ProductGroup[] {
    return groups.map(group => {
      const allPrices = group.products
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      const meliProducts = group.products.filter(p => p.site === 'MercadoLibre');
      const falabellaProducts = group.products.filter(p => p.site === 'Falabella');

      const meliStats = this.calculateSiteStats(meliProducts) || this.createEmptySiteStats();
      const falabellaStats = this.calculateSiteStats(falabellaProducts) || this.createEmptySiteStats();

      let savings: number | null = null;
      let cheaperSite: 'Falabella' | 'MercadoLibre' | null = null;
      
      if (meliStats.min > 0 && falabellaStats.min > 0) {
        if (meliStats.min < falabellaStats.min) {
          savings = falabellaStats.min - meliStats.min;
          cheaperSite = 'MercadoLibre';
        } else if (falabellaStats.min < meliStats.min) {
          savings = meliStats.min - falabellaStats.min;
          cheaperSite = 'Falabella';
        } else {
          savings = 0;
          cheaperSite = null;
        }
      }

      let priceDiff: number | null = null;
      if (meliStats.min > 0 && falabellaStats.min > 0) {
        priceDiff = meliStats.min - falabellaStats.min;
      }

      group.stats = {
        min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
        max: allPrices.length > 0 ? Math.max(...allPrices) : 0,
        avg: allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0,
        falabella: falabellaStats,
        meli: meliStats,
        savings,
        cheaperSite,
        meliCount: meliProducts.length,
        falabellaCount: falabellaProducts.length,
        priceDiff
      };
      
      return group;
    });
  }

  private static createEmptyGroupStats(): GroupStats {
    return {
      min: 0,
      max: 0,
      avg: 0,
      falabella: this.createEmptySiteStats(),
      meli: this.createEmptySiteStats(),
      savings: null,
      cheaperSite: null,
      meliCount: 0,
      falabellaCount: 0,
      priceDiff: null
    };
  }

  private static createEmptySiteStats(): SiteStats {
    return { count: 0, min: 0, max: 0, avg: 0 };
  }
}
