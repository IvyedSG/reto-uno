import { StorageManager } from '../utils/storage-manager';
import { PORT_NAMES, ScrapingUpdate, PortMessage, KeywordStatus, Site, ScrapingMode, SCRAPING_LIMITS } from '../types';
import { PortManager } from '../utils/messaging';
import { ProductMatcher } from '../utils/product-matcher';

// SVG Icons
const ICONS = {
  search: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>`,
  delete: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>`,
  stats: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
  </svg>`,
  cancel: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
  </svg>`,
  spinner: `<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>`,
  check: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
  </svg>`,
  error: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  pause: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  savings: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  document: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>`,
  trophy: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
  </svg>`,
  chevronDown: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
  </svg>`,
  chevronUp: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
  </svg>`,
  package: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
  </svg>`,
  externalLink: `<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg>`
};

document.addEventListener('DOMContentLoaded', async () => {
  const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-keyword-btn');
  const keywordsList = document.getElementById('keywords-list');
  const statsPanel = document.getElementById('stats-panel');
  const statsContent = document.getElementById('stats-content');
  const closeStatsBtn = document.getElementById('close-stats-btn');
  const modeSelect = document.getElementById('scraping-mode-select') as HTMLSelectElement;

  const searchPort = new PortManager();

  // Load saved scraping mode preference
  const loadScrapingMode = async (): Promise<ScrapingMode> => {
    const result = await chrome.storage.local.get('scrapingMode');
    return (result.scrapingMode as ScrapingMode) || 'normal';
  };

  // Save scraping mode preference
  const saveScrapingMode = async (mode: ScrapingMode): Promise<void> => {
    await chrome.storage.local.set({ scrapingMode: mode });
  };

  // Get current scraping mode from select
  const getScrapingMode = (): ScrapingMode => {
    return (modeSelect?.value as ScrapingMode) || 'normal';
  };

  // Initialize mode select with saved preference
  if (modeSelect) {
    const savedMode = await loadScrapingMode();
    modeSelect.value = savedMode;
    modeSelect.addEventListener('change', () => {
      saveScrapingMode(getScrapingMode());
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log('[Popup] Storage changed:', areaName, Object.keys(changes));
    if (areaName === 'local' && changes.keywords) {
      console.log('[Popup] Keywords changed, re-rendering...');
      renderKeywords();
    }
  });

  const ensureConnected = () => {
    if (!searchPort.isConnected()) {
      searchPort.connect(PORT_NAMES.SEARCH);
      
      searchPort.onMessage((msg: PortMessage) => {
        handleScrapingUpdate(msg.payload);
      });

      searchPort.onDisconnect(() => {
        console.log('Popup: Desconectado');
      });
    }
  };

  /**
   * Inicia scraping para UN SOLO sitio
   */
  const startSiteScraping = async (keywordId: string, site: Site) => {
    ensureConnected();
    
    const keywords = await StorageManager.getKeywords();
    const keyword = keywords.find(k => k.id === keywordId);
    if (!keyword) return;

    const mode = getScrapingMode();
    const limits = SCRAPING_LIMITS[mode];
    const siteKey = site === 'Falabella' ? 'falabella' : 'mercadolibre';

    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
    await renderKeywords();

    console.log(`[Popup] Starting ${site} scraping in '${mode}' mode (max: ${limits[siteKey]} products)`);

    searchPort.postMessage('START_SCRAPING', {
      action: 'START_SCRAPING',
      keywordId,
      keywordText: keyword.text,
      site,
      scrapingMode: mode,
      maxProducts: limits[siteKey],
      maxPages: limits.maxPages[siteKey]
    } as ScrapingUpdate);
  };

  /**
   * Cancela el scraping para una keyword
   */
  const cancelScraping = async (keywordId: string) => {
    ensureConnected();
    
    searchPort.postMessage('CANCEL_SCRAPING', {
      action: 'CANCEL_SCRAPING',
      keywordId
    } as ScrapingUpdate);

    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
    await renderKeywords();
  };

  const handleScrapingUpdate = async (_update: ScrapingUpdate) => {
    // Storage listener updates UI automatically
  };

  /**
   * Calcula estadísticas por sitio
   */
  const calculateSiteStats = (products: { priceNumeric: number | null }[]) => {
    const prices = products.map(p => p.priceNumeric).filter((p): p is number => p !== null);
    if (prices.length === 0) return null;
    
    return {
      count: products.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    };
  };

  /**
   * Muestra las estadísticas para una keyword
   */
  const showStats = async (keywordId: string) => {
    const products = await StorageManager.getProducts(keywordId);
    const keywords = await StorageManager.getKeywords();
    const keyword = keywords.find(k => k.id === keywordId);
    
    if (!keyword || products.length === 0) {
      if (statsContent) statsContent.innerHTML = `
        <div class="text-center py-4">
          <p class="text-slate-500 text-sm">No hay productos para mostrar.</p>
          <p class="text-slate-400 text-xs mt-1">Ejecuta primero una búsqueda.</p>
        </div>`;
      statsPanel?.classList.remove('hidden');
      return;
    }

    const falabellaProducts = products.filter(p => p.site === 'Falabella');
    const meliProducts = products.filter(p => p.site === 'MercadoLibre');
    
    const falabellaStats = calculateSiteStats(falabellaProducts);
    const meliStats = calculateSiteStats(meliProducts);
    
    // Ahorro potencial
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

    // Top 3 mejores ofertas
    const allPrices = products
      .filter(p => p.priceNumeric !== null)
      .sort((a, b) => (a.priceNumeric as number) - (b.priceNumeric as number))
      .slice(0, 3);

    // Grupos similares
    const groups = ProductMatcher.groupSimilarProducts(products);

    const html = `
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
          ${falabellaStats ? `
          <div class="stats-card">
            <div class="flex items-center gap-1 mb-2">
              <span class="site-tag site-tag-falabella">Falabella</span>
              <span class="text-[10px] text-slate-400">${falabellaStats.count} productos</span>
            </div>
            <div class="space-y-1 text-xs">
              <p class="flex justify-between"><span class="text-slate-500">Mín:</span><span class="font-bold text-green-600">S/ ${falabellaStats.min.toFixed(2)}</span></p>
              <p class="flex justify-between"><span class="text-slate-500">Máx:</span><span class="text-slate-700">S/ ${falabellaStats.max.toFixed(2)}</span></p>
              <p class="flex justify-between"><span class="text-slate-500">Prom:</span><span class="text-slate-600">S/ ${falabellaStats.avg.toFixed(2)}</span></p>
            </div>
          </div>
          ` : '<div class="stats-card text-center text-slate-400 text-xs py-4">Sin datos de Falabella</div>'}
          
          ${meliStats ? `
          <div class="stats-card">
            <div class="flex items-center gap-1 mb-2">
              <span class="site-tag site-tag-meli">MercadoLibre</span>
              <span class="text-[10px] text-slate-400">${meliStats.count} productos</span>
            </div>
            <div class="space-y-1 text-xs">
              <p class="flex justify-between"><span class="text-slate-500">Mín:</span><span class="font-bold text-green-600">S/ ${meliStats.min.toFixed(2)}</span></p>
              <p class="flex justify-between"><span class="text-slate-500">Máx:</span><span class="text-slate-700">S/ ${meliStats.max.toFixed(2)}</span></p>
              <p class="flex justify-between"><span class="text-slate-500">Prom:</span><span class="text-slate-600">S/ ${meliStats.avg.toFixed(2)}</span></p>
            </div>
          </div>
          ` : '<div class="stats-card text-center text-slate-400 text-xs py-4">Sin datos de MercadoLibre</div>'}
        </div>

        ${allPrices.length > 0 ? `
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
        ` : ''}

        ${groups.length > 0 ? `
        <div class="border-t border-slate-100 pt-3">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Productos Similares (${groups.length} grupos)</p>
          ${groups.slice(0, 5).map((group, i) => {
            const { falabella, meli, savings, cheaperSite } = group.stats;
            const groupId = `group-${i}`;
            
            const formatPrice = (p: number | null) => p !== null ? `S/ ${p.toFixed(0)}` : '-';
            
            // Sort products by price
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
        ` : ''}
      </div>
    `;

    if (statsContent) statsContent.innerHTML = html;
    statsPanel?.classList.remove('hidden');
  };

  /**
   * Renderiza la lista de keywords con 4 botones cada una
   */
  const renderKeywords = async () => {
    if (!keywordsList) return;
    const keywords = await StorageManager.getKeywords();
    
    if (keywords.length === 0) {
      keywordsList.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 opacity-40">
          <p class="text-xs font-medium text-center text-slate-800">No hay keywords. Agrega una para comenzar.</p>
        </div>`;
      return;
    }

    keywordsList.innerHTML = keywords.map(k => `
      <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl" data-id="${k.id}">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            ${ICONS.document}
            ${k.text}
          </span>
          <div class="flex items-center gap-1">
            <button class="btn-icon-stats stats-btn" data-id="${k.id}" title="Ver estadísticas">
              ${ICONS.stats}
            </button>
            <button class="btn-icon-delete delete-btn" data-id="${k.id}" title="Eliminar keyword">
              ${ICONS.delete}
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-2 mb-2">
          ${k.status === KeywordStatus.RUNNING ? `
            <button class="btn-cancel cancel-btn flex-1 justify-center" data-id="${k.id}">
              ${ICONS.cancel}
              <span>Cancelar</span>
            </button>
          ` : `
            <button class="btn-site btn-falabella search-site-btn flex-1" data-id="${k.id}" data-site="Falabella">
              ${ICONS.search}
              <span>Falabella</span>
            </button>
            <button class="btn-site btn-meli search-site-btn flex-1" data-id="${k.id}" data-site="MercadoLibre">
              ${ICONS.search}
              <span>MercadoLibre</span>
            </button>
          `}
        </div>
        
        <div class="flex items-center gap-3 text-[10px]">
          <span class="status-badge ${getStatusClass(k.status)}">${getStatusIcon(k.status)} ${getStatusText(k.status)}</span>
          <span class="text-slate-400">Productos: ${k.productCount}</span>
        </div>
      </div>
    `).join('');

    // Event listeners para búsqueda por sitio
    keywordsList.querySelectorAll('.search-site-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        const site = (btn as HTMLElement).dataset.site as Site;
        if (id && site) startSiteScraping(id, site);
      });
    });

    keywordsList.querySelectorAll('.stats-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) showStats(id);
      });
    });

    keywordsList.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) cancelScraping(id);
      });
    });

    keywordsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          await StorageManager.deleteKeyword(id);
          renderKeywords();
        }
      });
    });
  };

  const getStatusClass = (status: KeywordStatus): string => {
    const classes: Record<KeywordStatus, string> = {
      [KeywordStatus.RUNNING]: 'status-running',
      [KeywordStatus.DONE]: 'status-done',
      [KeywordStatus.ERROR]: 'status-error',
      [KeywordStatus.CANCELLED]: 'status-cancelled',
      [KeywordStatus.IDLE]: 'status-idle'
    };
    return classes[status] || 'status-idle';
  };

  const getStatusIcon = (status: KeywordStatus): string => {
    const icons: Record<KeywordStatus, string> = {
      [KeywordStatus.RUNNING]: ICONS.spinner,
      [KeywordStatus.DONE]: ICONS.check,
      [KeywordStatus.ERROR]: ICONS.error,
      [KeywordStatus.CANCELLED]: ICONS.cancel,
      [KeywordStatus.IDLE]: ICONS.pause
    };
    return icons[status] || ICONS.pause;
  };

  const getStatusText = (status: KeywordStatus): string => {
    const texts: Record<KeywordStatus, string> = {
      [KeywordStatus.RUNNING]: 'Ejecutando...',
      [KeywordStatus.DONE]: 'Completado',
      [KeywordStatus.ERROR]: 'Error',
      [KeywordStatus.CANCELLED]: 'Cancelado',
      [KeywordStatus.IDLE]: 'Idle'
    };
    return texts[status] || 'Idle';
  };

  const handleAddKeyword = async () => {
    const text = keywordInput.value.trim();
    if (text) {
      await StorageManager.addKeyword(text);
      keywordInput.value = '';
      await renderKeywords();
    }
  };

  addBtn?.addEventListener('click', handleAddKeyword);
  keywordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddKeyword();
  });
  closeStatsBtn?.addEventListener('click', () => {
    statsPanel?.classList.add('hidden');
  });

  // Handler global para links de productos - usar chrome.tabs.create
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
          
          // Update button text and icon
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

  await renderKeywords();
});
