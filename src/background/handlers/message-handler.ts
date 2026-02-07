import { ScrapingUpdate } from '@/shared/types/message.types';
import { ScrapingOrchestrator } from '@/background/services/scraping-orchestrator';

export class MessageHandler {
  constructor(private orchestrator: ScrapingOrchestrator) {}

  init() {
    chrome.runtime.onMessage.addListener((message: ScrapingUpdate) => {
      this.handleContentScriptMessage(message);
      return true;
    });
  }

  private handleContentScriptMessage(message: ScrapingUpdate) {
    if (message.keywordId) {
      this.orchestrator.handleScrapingUpdate(message);
    }
  }
}
