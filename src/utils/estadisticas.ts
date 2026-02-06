import { ProductGroup } from './product-matcher';

export interface ComparisonReport {
  totalGroups: number;
  bestDeals: ProductGroup[];
  overallSavings: number;
}

/**
 * Genera reportes estadísticos basados en los grupos de productos similares.
 */
export class Estadisticas {
  /**
   * Genera un ranking de las mejores oportunidades de ahorro.
   */
  static generateComparisonReport(groups: ProductGroup[]): ComparisonReport {
    const mixedGroups = groups.filter(g => g.stats.meliCount > 0 && g.stats.falabellaCount > 0);
    const rankedGroups = mixedGroups.sort((a, b) => {
      const diffA = Math.abs(a.stats.maxPrice - a.stats.minPrice);
      const diffB = Math.abs(b.stats.maxPrice - b.stats.minPrice);
      return diffB - diffA;
    });

    return {
      totalGroups: groups.length,
      bestDeals: rankedGroups.slice(0, 5),
      overallSavings: rankedGroups.reduce((acc, g) => acc + (g.stats.maxPrice - g.stats.minPrice), 0)
    };
  }
}
