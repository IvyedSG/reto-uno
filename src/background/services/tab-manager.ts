import { TIMEOUTS } from '@/shared/constants/scraper-config';

export class TabManager {
  private static ports: Map<number, chrome.runtime.Port> = new Map();

  static async createTab(url: string, active: boolean = false): Promise<number> {
    const tab = await chrome.tabs.create({ url, active });
    return tab.id!;
  }

  static async connect(tabId: number): Promise<chrome.runtime.Port> {
    const port = chrome.tabs.connect(tabId, { name: 'content-bridge' });
    this.ports.set(tabId, port);
    
    port.onDisconnect.addListener(() => {
      this.ports.delete(tabId);
    });
    
    return port;
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

  static sendMessage(tabId: number, message: any): void {
    const port = this.ports.get(tabId);
    if (port) {
      port.postMessage(message);
    } else {
      chrome.tabs.sendMessage(tabId, message);
    }
  }

  static async closeTab(tabId: number): Promise<void> {
    try {
      const port = this.ports.get(tabId);
      if (port) {
        port.disconnect();
        this.ports.delete(tabId);
      }
      await chrome.tabs.remove(tabId);
    } catch (e) {
    }
  }
}
