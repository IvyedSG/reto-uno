/**
 * Port Handler - Manages typed port connections from the popup
 */

import { PORT_NAMES, PortMessage } from '../../shared/types/message.types';
import { PortManager } from '../../shared/messaging/port-manager';
import { ScrapingOrchestrator } from '../services/scraping-orchestrator';
import { SCRAPING_LIMITS } from '../../shared/constants/scraper-config';

export class PortHandler {
  private messenger: PortManager;
  private orchestrator: ScrapingOrchestrator;

  constructor(messenger: PortManager, orchestrator: ScrapingOrchestrator) {
    this.messenger = messenger;
    this.orchestrator = orchestrator;
  }

  /**
   * Initializes the onConnect listener for extension ports
   */
  init() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== PORT_NAMES.SEARCH) return;

      console.log('[PortHandler] New popup connection established');
      this.messenger.setPort(port);

      this.messenger.onMessage(async (message: PortMessage) => {
        await this.handlePopupMessage(message);
      });
    });
  }

  /**
   * Routes messages from the popup to the appropriate orchestrator action
   */
  private async handlePopupMessage(message: PortMessage) {
    const { type, payload } = message;
    
    if (type === 'START_SCRAPING' && payload.keywordId && payload.site) {
      const { keywordId, keywordText, site, scrapingMode } = payload;
      const limits = SCRAPING_LIMITS[scrapingMode || 'fast'];
      const siteKey = (site as string).toLowerCase() === 'falabella' ? 'falabella' : 'mercadolibre';
      
      await this.orchestrator.startScraping(
        site, 
        keywordId, 
        keywordText || '', 
        limits[siteKey as keyof typeof limits & ('falabella' | 'mercadolibre')], 
        limits.maxPages[siteKey as keyof typeof limits.maxPages & ('falabella' | 'mercadolibre')]
      );
    }

    if (type === 'CANCEL_SCRAPING') {
      await this.orchestrator.cancelScraping(payload.keywordId);
    }
  }
}
