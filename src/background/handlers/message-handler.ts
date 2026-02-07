/**
 * Message Handler - Manages one-time messages from content scripts
 */

import { ScrapingUpdate } from '../../shared/types/message.types';
import { ScrapingOrchestrator } from '../services/scraping-orchestrator';

export class MessageHandler {
  private orchestrator: ScrapingOrchestrator;

  constructor(orchestrator: ScrapingOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Initializes the onMessage listener for content scripts
   */
  init() {
    chrome.runtime.onMessage.addListener((message: ScrapingUpdate, sender) => {
      this.handleContentScriptMessage(message, sender);
      return true; // Keep channel open for async responses if needed
    });
  }

  /**
   * Routes messages from content scripts to the appropriate orchestrator action
   */
  private handleContentScriptMessage(message: ScrapingUpdate, sender: chrome.runtime.MessageSender) {
    const { action, keywordId, site, products } = message;

    if (!keywordId) return;

    if (action === 'SCRAPING_PROGRESS') {
      this.orchestrator.handleProgress(keywordId, products?.length || 0, products);
    }

    if (site && (action === 'SCRAPING_DONE' || action === 'SCRAPING_ERROR')) {
      const results = action === 'SCRAPING_DONE' ? (products || []) : [];
      this.orchestrator.handlePageDone(keywordId, site, results, sender.tab?.id);
    }
  }
}
