/**
 * Popup main entry point - uses modular components
 */

import { StorageManager } from '../shared/utils/storage-manager';
import { PortManager } from '../shared/messaging/port-manager';
import { PORT_NAMES, ScrapingUpdate, PortMessage } from '../shared/types/message.types';
import { KeywordStatus } from '../shared/types/product.types';
import { Site, ScrapingMode } from '../shared/types/scraper.types';
import { SCRAPING_LIMITS } from '../shared/constants/scraper-config';

// Components
import { renderKeywordList, KeywordListHandlers } from './components/KeywordList';
import { renderStatsPanel, attachStatsPanelHandlers } from './components/StatsPanel';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-keyword-btn');
  const keywordsList = document.getElementById('keywords-list');
  const statsPanel = document.getElementById('stats-panel');
  const statsContent = document.getElementById('stats-content');
  const closeStatsBtn = document.getElementById('close-stats-btn');
  const modeSelect = document.getElementById('scraping-mode-select') as HTMLSelectElement;

  // Port for communication with background
  const searchPort = new PortManager();

  // Scraping mode management
  const loadScrapingMode = async (): Promise<ScrapingMode> => {
    const result = await chrome.storage.local.get('scrapingMode');
    return (result.scrapingMode as ScrapingMode) || 'fast';
  };

  const saveScrapingMode = async (mode: ScrapingMode): Promise<void> => {
    await chrome.storage.local.set({ scrapingMode: mode });
  };

  const getScrapingMode = (): ScrapingMode => {
    return (modeSelect?.value as ScrapingMode) || 'fast';
  };

  // Initialize mode select
  if (modeSelect) {
    const savedMode = await loadScrapingMode();
    modeSelect.value = savedMode;
    modeSelect.addEventListener('change', () => {
      saveScrapingMode(getScrapingMode());
    });
  }

  // Storage change listener
  chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log('[Popup] Storage changed:', areaName, Object.keys(changes));
    if (areaName === 'local' && changes.keywords) {
      console.log('[Popup] Keywords changed, re-rendering...');
      renderKeywords();
    }
  });

  // Ensure port connection
  const ensureConnected = () => {
    if (!searchPort.isConnected()) {
      searchPort.connect(PORT_NAMES.SEARCH);
      
      searchPort.onMessage((_msg: PortMessage) => {
        // Storage listener updates UI automatically
      });

      searchPort.onDisconnect(() => {
        console.log('Popup: Desconectado');
      });
    }
  };

  /**
   * Start scraping for a single site
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
   * Cancel scraping for a keyword
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

  /**
   * Show stats for a keyword
   */
  const showStats = async (keywordId: string) => {
    const products = await StorageManager.getProducts(keywordId);
    const keywords = await StorageManager.getKeywords();
    const keyword = keywords.find(k => k.id === keywordId);
    
    if (!keyword) return;

    if (statsContent) {
      statsContent.innerHTML = renderStatsPanel(keyword, products);
    }
    statsPanel?.classList.remove('hidden');
  };

  /**
   * Render keywords list
   */
  const renderKeywords = async () => {
    if (!keywordsList) return;
    const keywords = await StorageManager.getKeywords();
    
    const handlers: KeywordListHandlers = {
      onSearchSite: startSiteScraping,
      onCancel: cancelScraping,
      onStats: showStats,
      onDelete: async (id: string) => {
        await StorageManager.deleteKeyword(id);
        renderKeywords();
      }
    };

    renderKeywordList(keywordsList, keywords, handlers);
  };

  /**
   * Add new keyword
   */
  const handleAddKeyword = async () => {
    const text = keywordInput.value.trim();
    if (text) {
      await StorageManager.addKeyword(text);
      keywordInput.value = '';
      await renderKeywords();
    }
  };

  // Event listeners
  addBtn?.addEventListener('click', handleAddKeyword);
  keywordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddKeyword();
  });
  closeStatsBtn?.addEventListener('click', () => {
    statsPanel?.classList.add('hidden');
  });

  // Global handlers for stats panel
  attachStatsPanelHandlers();

  // Initial render
  await renderKeywords();
});
