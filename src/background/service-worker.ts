import { PORT_NAMES, ScrapingUpdate } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('PrecioScout Service Worker Initialized');
});

/**
 * Orquestador central para la comunicación entre el popup y los content scripts.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAMES.SEARCH) return;

  console.log('Background: Nueva conexión establecida:', port.name);

  port.onMessage.addListener(async (message: ScrapingUpdate) => {
    console.log('Background: Mensaje recibido:', message.action);

    if (message.action === 'START_SCRAPING') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, message);
      }
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('Background: Conexión cerrada');
  });
});

chrome.runtime.onMessage.addListener((message: ScrapingUpdate) => {
  console.log('Background: Actualización global recibida:', message.action);
});
