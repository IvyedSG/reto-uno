import { PortManager } from '../shared/messaging/port-manager';
import { ScrapingOrchestrator } from './services/scraping-orchestrator';
import { PortHandler } from './handlers/port-handler';
import { MessageHandler } from './handlers/message-handler';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ServiceWorker] PrecioScout Initialized');
});

// Initialization of Services and Handlers
const messenger = new PortManager();
const orchestrator = new ScrapingOrchestrator(messenger);

const portHandler = new PortHandler(messenger, orchestrator);
const messageHandler = new MessageHandler(orchestrator);

// Start listeners
portHandler.init();
messageHandler.init();

