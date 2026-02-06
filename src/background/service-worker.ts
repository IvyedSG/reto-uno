import { PORT_NAMES, ScrapingUpdate, PortMessage } from '../types';
import { PortManager } from '../utils/messaging';

chrome.runtime.onInstalled.addListener(() => {
  console.log('PrecioScout Service Worker Initialized');
});

const orchestrator = new PortManager();

/**
 * Orquestador central para la comunicación entre el popup y los content scripts.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAMES.SEARCH) return;

  console.log('Background: Nueva conexión establecida:', port.name);
  orchestrator.setPort(port);

  orchestrator.onMessage(async (message: PortMessage) => {
    console.log('Background: Mensaje recibido:', message.type);

    if (message.type === 'START_SCRAPING') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, message.payload);
      }
    }
  });

  orchestrator.onDisconnect(() => {
    console.log('Background: Conexión cerrada');
  });
});

chrome.runtime.onMessage.addListener((message: ScrapingUpdate) => {
  console.log('Background: Actualización global recibida:', message.action);
});
