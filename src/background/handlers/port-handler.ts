import { PORT_NAMES, PortMessage } from '@/shared/types/message.types';
import { PortManager } from '@/shared/messaging/port-manager';
import { ScrapingOrchestrator } from '@/background/services/scraping-orchestrator';

export class PortHandler {
  constructor(
    private messenger: PortManager,
    private orchestrator: ScrapingOrchestrator
  ) {}

  init() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== PORT_NAMES.SEARCH) return;
      this.messenger.setPort(port);

      this.messenger.onMessage(async (message: PortMessage) => {
        await this.handlePopupMessage(message);
      });
    });
  }

  private async handlePopupMessage(message: PortMessage) {
    const { type, payload } = message;
    
    if (type === 'START_SCRAPING' && payload.keywordId && payload.site) {
      await this.orchestrator.startScraping(payload);
    }

    if (type === 'CANCEL_SCRAPING') {
      await this.orchestrator.cancelScraping(payload.keywordId);
    }
  }
}
