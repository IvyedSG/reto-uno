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
    priceDiff: number | null;
  };
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
          stats: { minPrice: 0, maxPrice: 0, avgPrice: 0, meliCount: 0, falabellaCount: 0, priceDiff: null }
        });
      }
    }

    // Calculate stats and filter to only groups with products from BOTH sites
    const groupsWithStats = this.calculateStatsForGroups(groups);
    
    // Filter to groups that have products from both sites (cross-site comparison)
    const crossSiteGroups = groupsWithStats.filter(g => 
      g.stats.meliCount > 0 && g.stats.falabellaCount > 0
    );

    // Sort by savings opportunity (price difference)
    return crossSiteGroups.sort((a, b) => {
      const diffA = Math.abs(a.stats.priceDiff ?? 0);
      const diffB = Math.abs(b.stats.priceDiff ?? 0);
      return diffB - diffA;
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

  private static calculateStatsForGroups(groups: ProductGroup[]): ProductGroup[] {
    return groups.map(group => {
      const prices = group.products
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      const meliPrices = group.products
        .filter(p => p.site === 'MercadoLibre')
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      const falabellaPrices = group.products
        .filter(p => p.site === 'Falabella')
        .map(p => p.priceNumeric)
        .filter((p): p is number => p !== null && p > 0);

      const meliMin = meliPrices.length > 0 ? Math.min(...meliPrices) : null;
      const falabellaMin = falabellaPrices.length > 0 ? Math.min(...falabellaPrices) : null;
      
      // Price difference: positive = Falabella cheaper, negative = Meli cheaper
      let priceDiff: number | null = null;
      if (meliMin !== null && falabellaMin !== null) {
        priceDiff = meliMin - falabellaMin;
      }

      group.stats = {
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        meliCount: group.products.filter(p => p.site === 'MercadoLibre').length,
        falabellaCount: group.products.filter(p => p.site === 'Falabella').length,
        priceDiff
      };
      
      return group;
    });
  }
}
