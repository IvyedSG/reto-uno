import { StorageManager } from '../utils/storage-manager';
import { PORT_NAMES, ScrapingUpdate, PortMessage, KeywordStatus, Site } from '../types';
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
  savings: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  document: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>`,
  trophy: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
  </svg>`
};

document.addEventListener('DOMContentLoaded', async () => {
  const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-keyword-btn');
  const keywordsList = document.getElementById('keywords-list');
  const statsPanel = document.getElementById('stats-panel');
  const statsContent = document.getElementById('stats-content');
  const closeStatsBtn = document.getElementById('close-stats-btn');

  const searchPort = new PortManager();

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

    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
    await renderKeywords();

    searchPort.postMessage('START_SCRAPING', {
      action: 'START_SCRAPING',
      keywordId,
      keywordText: keyword.text,
      site
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
              <div class="flex items-start gap-2 ${i === 0 ? 'bg-yellow-50 -mx-2 px-2 py-1 rounded' : ''}">
                <span class="text-xs font-bold ${i === 0 ? 'text-yellow-600' : 'text-slate-400'}">#${i + 1}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] text-slate-700 truncate" title="${item.title}">${item.title}</p>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-green-600 text-xs">S/ ${item.priceNumeric?.toFixed(2)}</span>
                    <span class="site-tag ${item.site === 'Falabella' ? 'site-tag-falabella' : 'site-tag-meli'}">${item.site}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${groups.length > 0 ? `
        <div class="border-t border-slate-100 pt-3">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Productos Similares (${groups.length} grupos)</p>
          ${groups.slice(0, 3).map((group, i) => {
            const falProds = group.products.filter(p => p.site === 'Falabella');
            const meliProds = group.products.filter(p => p.site === 'MercadoLibre');
            
            return `
            <div class="stats-card mb-2">
              <p class="text-[11px] font-medium text-slate-700 truncate mb-1" title="${group.name}">
                Grupo ${i + 1}: ${group.name.substring(0, 35)}...
              </p>
              <div class="flex gap-3 text-[10px] text-slate-500">
                ${falProds.length > 0 ? `<span><span class="site-tag site-tag-falabella">F</span> ${falProds.length}</span>` : ''}
                ${meliProds.length > 0 ? `<span><span class="site-tag site-tag-meli">ML</span> ${meliProds.length}</span>` : ''}
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

  await renderKeywords();
});
