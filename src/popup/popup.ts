import { StorageManager } from '@/shared/utils/storage-manager';
import { PortManager } from '@/shared/messaging/port-manager';
import { PORT_NAMES, ScrapingUpdate } from '@/shared/types/message.types';
import { KeywordStatus } from '@/shared/types/product.types';
import { Site, ScrapingMode } from '@/shared/types/scraper.types';
import { SCRAPING_LIMITS } from '@/shared/constants/scraper-config';

import { renderKeywordList, KeywordListHandlers } from '@/popup/components/keyword-list';
import { renderStatsPanel, attachStatsPanelHandlers } from '@/popup/components/stats-panel';

document.addEventListener('DOMContentLoaded', async () => {
  const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-keyword-btn');
  const keywordsList = document.getElementById('keywords-list');
  const statsPanel = document.getElementById('stats-panel');
  const statsContent = document.getElementById('stats-content');
  const closeStatsBtn = document.getElementById('close-stats-btn');
  const modeSelect = document.getElementById('scraping-mode-select') as HTMLSelectElement;

  const searchPort = new PortManager();

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

  if (modeSelect) {
    const savedMode = await loadScrapingMode();
    modeSelect.value = savedMode;
    modeSelect.addEventListener('change', () => {
      saveScrapingMode(getScrapingMode());
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.keywords) {
      renderKeywords();
    }
  });

  const ensureConnected = () => {
    if (!searchPort.isConnected()) {
      searchPort.connect(PORT_NAMES.SEARCH);
      searchPort.onMessage(() => {});
    }
  };

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

  const cancelScraping = async (keywordId: string) => {
    ensureConnected();
    searchPort.postMessage('CANCEL_SCRAPING', {
      action: 'CANCEL_SCRAPING',
      keywordId
    } as ScrapingUpdate);

    await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
    await renderKeywords();
  };

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

  attachStatsPanelHandlers();
  await renderKeywords();
});
