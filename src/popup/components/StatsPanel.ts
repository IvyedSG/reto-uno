/**
 * StatsPanel - Displays product statistics for a keyword
 */

import { Keyword, Product } from '../../shared/types/product.types';
import { ProductMatcher, ProductGroup } from '../../shared/utils/product-matcher';
import { ICONS } from './Icons';

interface SiteStats {
  count: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * Calculate statistics for products from a site
 */
function calculateSiteStats(products: Product[]): SiteStats | null {
  const prices = products.map(p => p.priceNumeric).filter((p): p is number => p !== null);
  if (prices.length === 0) return null;
  
  return {
    count: products.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length
  };
}

/**
 * Render site stats card
 */
function renderSiteStatsCard(siteName: string, stats: SiteStats | null, tagClass: string): string {
  if (!stats) {
    return `<div class="stats-card text-center text-slate-400 text-xs py-4">Sin datos de ${siteName}</div>`;
  }
  
  return `
    <div class="stats-card">
      <div class="flex items-center gap-1 mb-2">
        <span class="site-tag ${tagClass}">${siteName}</span>
        <span class="text-[10px] text-slate-400">${stats.count} productos</span>
      </div>
      <div class="space-y-1 text-xs">
        <p class="flex justify-between"><span class="text-slate-500">Mín:</span><span class="font-bold text-green-600">S/ ${stats.min.toFixed(2)}</span></p>
        <p class="flex justify-between"><span class="text-slate-500">Máx:</span><span class="text-slate-700">S/ ${stats.max.toFixed(2)}</span></p>
        <p class="flex justify-between"><span class="text-slate-500">Prom:</span><span class="text-slate-600">S/ ${stats.avg.toFixed(2)}</span></p>
      </div>
    </div>
  `;
}

/**
 * Render top 3 best offers
 */
function renderTopOffers(products: Product[]): string {
  const allPrices = products
    .filter(p => p.priceNumeric !== null)
    .sort((a, b) => (a.priceNumeric as number) - (b.priceNumeric as number))
    .slice(0, 3);

  if (allPrices.length === 0) return '';

  return `
    <div class="stats-card">
      <div class="flex items-center gap-2 mb-2">
        ${ICONS.trophy}
        <span class="font-bold text-slate-700 text-xs">Top 3 Mejores Ofertas</span>
      </div>
      <div class="space-y-2">
        ${allPrices.map((item, i) => `
          <a href="${item.url}" target="_blank" class="block cursor-pointer hover:bg-slate-100 rounded transition-colors product-link ${i === 0 ? 'bg-yellow-50 -mx-2 px-2 py-1' : ''}" data-url="${item.url}">
            <div class="flex items-start gap-2">
              <span class="text-xs font-bold ${i === 0 ? 'text-yellow-600' : 'text-slate-400'}">#${i + 1}</span>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] text-slate-700 truncate hover:text-blue-600" title="${item.title}">${item.title}</p>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-green-600 text-xs">S/ ${item.priceNumeric?.toFixed(2)}</span>
                  <span class="site-tag ${item.site === 'Falabella' ? 'site-tag-falabella' : 'site-tag-meli'}">${item.site}</span>
                </div>
              </div>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render similar product groups
 */
function renderProductGroups(groups: ProductGroup[]): string {
  if (groups.length === 0) return '';

  const formatPrice = (p: number | null) => p !== null ? `S/ ${p.toFixed(0)}` : '-';

  return `
    <div class="border-t border-slate-100 pt-3">
      <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Productos Similares (${groups.length} grupos)</p>
      ${groups.slice(0, 5).map((group, i) => {
        const { falabella, meli, savings, cheaperSite } = group.stats;
        const groupId = `group-${i}`;
        
        const falabellaProds = group.products.filter(p => p.site === 'Falabella').sort((a, b) => (a.priceNumeric ?? Infinity) - (b.priceNumeric ?? Infinity));
        const meliProds = group.products.filter(p => p.site === 'MercadoLibre').sort((a, b) => (a.priceNumeric ?? Infinity) - (b.priceNumeric ?? Infinity));
        
        return `
        <div class="stats-card mb-3 ${savings && savings > 0 ? 'ring-1 ring-green-200' : ''}">
          <!-- Header with expand toggle -->
          <div class="flex items-start justify-between cursor-pointer group-toggle" data-group="${groupId}">
            <p class="text-[11px] font-bold text-slate-700 truncate flex-1" title="${group.name}">
              ${i + 1}. ${group.name.substring(0, 35)}${group.name.length > 35 ? '...' : ''}
            </p>
            <button class="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 transition-colors expand-btn" data-group="${groupId}">
              <span class="expand-text">Ver</span>
              <span class="chevron-icon">${ICONS.chevronDown}</span>
            </button>
          </div>
          
          <!-- Summary stats -->
          <div class="flex gap-3 text-xs text-slate-500 mt-1 mb-2">
            <span class="flex items-center gap-1">
              <span class="site-tag site-tag-falabella">F</span> ${falabella.count} · ${formatPrice(falabella.minPrice)}
            </span>
            <span class="flex items-center gap-1">
              <span class="site-tag site-tag-meli">ML</span> ${meli.count} · ${formatPrice(meli.minPrice)}
            </span>
          </div>
          
          <!-- Savings badge -->
          ${savings !== null && savings > 0 && cheaperSite ? `
          <div class="flex items-center gap-1 text-xs bg-green-50 text-green-700 rounded px-2 py-1 mb-2">
            <span class="text-green-600">${ICONS.savings}</span>
            <span class="font-bold">AHORRO: S/ ${savings.toFixed(0)}</span>
            <span class="text-green-600">en ${cheaperSite}</span>
          </div>
          ` : savings === 0 ? `
          <div class="text-xs text-slate-400 italic mb-2">Mismo precio</div>
          ` : ''}
          
          <!-- Expandable products list (hidden by default) -->
          <div class="products-list hidden border-t border-slate-100 pt-2 mt-1" id="${groupId}">
            ${falabellaProds.length > 0 ? `
            <div class="mb-2">
              <div class="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                ${ICONS.package}
                <span>Falabella (${falabellaProds.length})</span>
              </div>
              <div class="space-y-1 ml-4">
                ${falabellaProds.map(p => `
                  <a href="${p.url}" target="_blank" class="product-link flex items-start gap-1 text-[11px] hover:bg-slate-50 rounded p-0.5 cursor-pointer group" data-url="${p.url}">
                    <span class="text-slate-700 flex-1 truncate group-hover:text-blue-600">${p.title.substring(0, 40)}${p.title.length > 40 ? '...' : ''}</span>
                    <span class="font-bold text-green-600 whitespace-nowrap">S/ ${p.priceNumeric?.toFixed(0) ?? '-'}</span>
                    <span class="text-slate-400 group-hover:text-blue-500">${ICONS.externalLink}</span>
                  </a>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            ${meliProds.length > 0 ? `
            <div>
              <div class="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                ${ICONS.package}
                <span>MercadoLibre (${meliProds.length})</span>
              </div>
              <div class="space-y-1 ml-4">
                ${meliProds.map(p => `
                  <a href="${p.url}" target="_blank" class="product-link flex items-start gap-1 text-[11px] hover:bg-slate-50 rounded p-0.5 cursor-pointer group" data-url="${p.url}">
                    <span class="text-slate-700 flex-1 truncate group-hover:text-blue-600">${p.title.substring(0, 40)}${p.title.length > 40 ? '...' : ''}</span>
                    <span class="font-bold text-green-600 whitespace-nowrap">S/ ${p.priceNumeric?.toFixed(0) ?? '-'}</span>
                    <span class="text-slate-400 group-hover:text-blue-500">${ICONS.externalLink}</span>
                  </a>
                `).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render the complete stats panel content
 */
export function renderStatsPanel(keyword: Keyword, products: Product[]): string {
  if (products.length === 0) {
    return `
      <div class="text-center py-4">
        <p class="text-slate-500 text-sm">No hay productos para mostrar.</p>
        <p class="text-slate-400 text-xs mt-1">Ejecuta primero una búsqueda.</p>
      </div>
    `;
  }

  const falabellaProducts = products.filter(p => p.site === 'Falabella');
  const meliProducts = products.filter(p => p.site === 'MercadoLibre');
  
  const falabellaStats = calculateSiteStats(falabellaProducts);
  const meliStats = calculateSiteStats(meliProducts);
  
  // Calculate potential savings
  let savings = 0;
  let savingsSite = '';
  if (falabellaStats && meliStats) {
    if (falabellaStats.min < meliStats.min) {
      savings = meliStats.min - falabellaStats.min;
      savingsSite = 'Falabella';
    } else if (meliStats.min < falabellaStats.min) {
      savings = falabellaStats.min - meliStats.min;
      savingsSite = 'MercadoLibre';
    }
  }

  const groups = ProductMatcher.groupSimilarProducts(products);

  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        ${ICONS.document}
        <span class="font-semibold text-slate-700">${keyword.text}</span>
        <span class="text-xs text-slate-400">(${products.length} productos)</span>
      </div>

      ${savings > 0 ? `
      <div class="stats-card stats-highlight">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${ICONS.savings}
            <span class="font-bold text-emerald-700">Ahorro Potencial</span>
          </div>
          <span class="savings-badge">S/ ${savings.toFixed(2)}</span>
        </div>
        <p class="text-xs text-emerald-600 mt-1">Comprando en ${savingsSite} ahorras respecto al mínimo de la otra tienda</p>
      </div>
      ` : ''}

      <div class="grid grid-cols-2 gap-2">
        ${renderSiteStatsCard('Falabella', falabellaStats, 'site-tag-falabella')}
        ${renderSiteStatsCard('MercadoLibre', meliStats, 'site-tag-meli')}
      </div>

      ${renderTopOffers(products)}
      ${renderProductGroups(groups)}
    </div>
  `;
}

/**
 * Attach expand/collapse handlers for product groups
 */
export function attachStatsPanelHandlers(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Handle product links
    const link = target.closest('a.product-link');
    if (link) {
      e.preventDefault();
      const url = link.getAttribute('href');
      if (url) {
        chrome.tabs.create({ url, active: true });
      }
      return;
    }
    
    // Handle expand/collapse for product groups
    const expandBtn = target.closest('.expand-btn, .group-toggle');
    if (expandBtn) {
      const groupId = expandBtn.getAttribute('data-group');
      if (groupId) {
        const productsList = document.getElementById(groupId);
        const btn = document.querySelector(`.expand-btn[data-group="${groupId}"]`);
        
        if (productsList && btn) {
          const isHidden = productsList.classList.contains('hidden');
          productsList.classList.toggle('hidden');
          
          const expandText = btn.querySelector('.expand-text');
          const chevronIcon = btn.querySelector('.chevron-icon');
          
          if (expandText) {
            expandText.textContent = isHidden ? 'Ocultar' : 'Ver';
          }
          if (chevronIcon) {
            chevronIcon.innerHTML = isHidden ? ICONS.chevronUp : ICONS.chevronDown;
          }
        }
      }
    }
  });
}
