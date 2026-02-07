import { TIMEOUTS } from '@/shared/constants/scraper-config';

export class TabManager {
  private static activeTabId: number | null = null;

  static async createTab(url: string, active: boolean = false): Promise<number> {
    const tab = await chrome.tabs.create({ url, active });
    this.activeTabId = tab.id!;
    return tab.id!;
  }

  static async waitForLoad(tabId: number): Promise<void> {
    return new Promise((resolve) => {
      const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, TIMEOUTS.PAGE_LOAD + TIMEOUTS.NAVIGATION);
    });
  }

  static async injectScript(tabId: number, file: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file]
    });
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.SCRIPT_INJECTION));
  }

  static async sendMessage(tabId: number, message: any): Promise<void> {
    await chrome.tabs.sendMessage(tabId, message);
  }

  static async closeTab(tabId: number): Promise<void> {
    try {
      if (this.activeTabId === tabId) {
        this.activeTabId = null;
      }
      await chrome.tabs.remove(tabId);
    } catch (e) {
      console.warn(`[TabManager] No se pudo cerrar la pestaña ${tabId}: ${e}`);
    }
  }

  static async closeActiveTab(): Promise<void> {
    if (this.activeTabId !== null) {
      await this.closeTab(this.activeTabId);
    }
  }
}
