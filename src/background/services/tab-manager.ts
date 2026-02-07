/**
 * Tab Manager - Handles tab lifecycle, loading, and script injection
 */

import { TIMEOUTS } from '../../shared/constants/scraper-config';

export class TabManager {
  /**
   * Creates a new tab with the specified URL
   */
  static async createTab(url: string, active: boolean = false): Promise<number> {
    const tab = await chrome.tabs.create({ url, active });
    return tab.id!;
  }

  /**
   * Waits for a tab to finish loading
   */
  static async waitForLoad(tabId: number): Promise<void> {
    return new Promise((resolve) => {
      const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      
      // Safety timeout
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, TIMEOUTS.PAGE_LOAD + TIMEOUTS.NAVIGATION);
    });
  }

  /**
   * Injects a script file into a tab
   */
  static async injectScript(tabId: number, file: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file]
    });
    // Brief delay to allow script initialization
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.SCRIPT_INJECTION));
  }

  /**
   * Sends a message to a tab
   */
  static async sendMessage(tabId: number, message: any): Promise<void> {
    await chrome.tabs.sendMessage(tabId, message);
  }

  /**
   * Closes a tab safely
   */
  static async closeTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
    } catch (e) {
      console.warn(`[TabManager] Could not close tab ${tabId}: ${e}`);
    }
  }
}
