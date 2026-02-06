import { Product } from '../types';

export interface SiteStats {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
}

export interface GroupStats {
  // Overall stats
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  // Per-site stats
  falabella: SiteStats;
  meli: SiteStats;
  // Savings info
  savings: number | null;  // Positive = savings buying from cheaperSite
  cheaperSite: 'Falabella' | 'MercadoLibre' | null;
  // Legacy compatibility
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

/**
 * Utilidades para comparar títulos y precios y agrupar productos similares.
 * 
 * Criterio de similitud: Usa tokens significativos del título para agrupar productos.
 * Los productos se consideran similares si comparten al menos 60% de tokens significativos.
 * Se ignoran palabras comunes (stopwords) y se normalizan los títulos.
 */
export class ProductMatcher {
  private static readonly STOPWORDS = new Set([
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'con',
    'para', 'por', 'a', 'al', 'del', 'es', 'que', 'se', 'su', 'sus', 'the', 'and', 'or',
    'of', 'to', 'in', 'for', 'with', 'on', 'at', 'from', 'by', 'color', 'colores',
    'pack', 'set', 'kit', 'x', 'pcs', 'unidad', 'unidades', 'nuevo', 'new', 'original'
  ]);

  /**
   * Agrupa productos basándose en tokens significativos del título.
   * Solo agrupa productos que aparecen en AMBOS sitios.
   */
  static groupSimilarProducts(products: Product[]): ProductGroup[] {
    const groups: ProductGroup[] = [];

    // Sort by price to process cheaper items first (they become group representatives)
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
        
        // Require 50% token overlap for similarity
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
          stats: this.createEmptyStats()
        });
      }
    }

    // Calculate stats and filter to only groups with products from BOTH sites
    const groupsWithStats = this.calculateStatsForGroups(groups);
    
    // Filter to groups that have products from both sites (cross-site comparison)
    const crossSiteGroups = groupsWithStats.filter(g => 
      g.stats.meliCount > 0 && g.stats.falabellaCount > 0
    );

    // Sort by savings opportunity
    return crossSiteGroups.sort((a, b) => {
      const savingsA = a.stats.savings ?? 0;
      const savingsB = b.stats.savings ?? 0;
      return savingsB - savingsA;
    });
  }

  /**
   * Extrae tokens significativos de un título
   */
  private static extractTokens(title: string): Set<string> {
    const normalized = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ') // Keep only alphanumeric
      .split(/\s+/)
      .filter(t => t.length > 2) // Min 3 characters
      .filter(t => !this.STOPWORDS.has(t));
    
    return new Set(normalized);
  }

  /**
   * Calcula similitud basada en tokens compartidos (Jaccard similarity)
   */
  private static calculateTokenSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    let intersection = 0;
    for (const token of tokens1) {
      if (tokens2.has(token)) intersection++;
    }
    
    const union = tokens1.size + tokens2.size - intersection;
    return intersection / union;
  }

  private static createEmptyStats(): GroupStats {
    return {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      falabella: { count: 0, minPrice: null, maxPrice: null, avgPrice: null },
      meli: { count: 0, minPrice: null, maxPrice: null, avgPrice: null },
      savings: null,
      cheaperSite: null,
      meliCount: 0,
      falabellaCount: 0,
      priceDiff: null
    };
  }

  private static calculateStatsForGroups(groups: ProductGroup[]): ProductGroup[] {
    return groups.map(group => {
      const prices = group.products
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      const meliProducts = group.products.filter(p => p.site === 'MercadoLibre');
      const falabellaProducts = group.products.filter(p => p.site === 'Falabella');

      const meliPrices = meliProducts
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      const falabellaPrices = falabellaProducts
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      // Calculate per-site stats
      const meliStats: SiteStats = {
        count: meliProducts.length,
        minPrice: meliPrices.length > 0 ? Math.min(...meliPrices) : null,
        maxPrice: meliPrices.length > 0 ? Math.max(...meliPrices) : null,
        avgPrice: meliPrices.length > 0 ? meliPrices.reduce((a, b) => a + b, 0) / meliPrices.length : null
      };

      const falabellaStats: SiteStats = {
        count: falabellaProducts.length,
        minPrice: falabellaPrices.length > 0 ? Math.min(...falabellaPrices) : null,
        maxPrice: falabellaPrices.length > 0 ? Math.max(...falabellaPrices) : null,
        avgPrice: falabellaPrices.length > 0 ? falabellaPrices.reduce((a, b) => a + b, 0) / falabellaPrices.length : null
      };

      // Calculate savings (comparing min prices)
      let savings: number | null = null;
      let cheaperSite: 'Falabella' | 'MercadoLibre' | null = null;
      
      if (meliStats.minPrice !== null && falabellaStats.minPrice !== null) {
        if (meliStats.minPrice < falabellaStats.minPrice) {
          savings = falabellaStats.minPrice - meliStats.minPrice;
          cheaperSite = 'MercadoLibre';
        } else if (falabellaStats.minPrice < meliStats.minPrice) {
          savings = meliStats.minPrice - falabellaStats.minPrice;
          cheaperSite = 'Falabella';
        } else {
          savings = 0;
          cheaperSite = null; // Same price
        }
      }

      // Legacy priceDiff: positive = Falabella cheaper, negative = Meli cheaper
      let priceDiff: number | null = null;
      if (meliStats.minPrice !== null && falabellaStats.minPrice !== null) {
        priceDiff = meliStats.minPrice - falabellaStats.minPrice;
      }

      group.stats = {
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
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
}
