import { PortManager } from '@/shared/messaging/port-manager';
import { ScrapingOrchestrator } from '@/background/services/scraping-orchestrator';
import { PortHandler } from '@/background/handlers/port-handler';
import { MessageHandler } from '@/background/handlers/message-handler';

chrome.runtime.onInstalled.addListener(() => {
  // Inicializado
});

const messenger = new PortManager();
const orchestrator = new ScrapingOrchestrator(messenger);

const portHandler = new PortHandler(messenger, orchestrator);
const messageHandler = new MessageHandler(orchestrator);

portHandler.init();
messageHandler.init();
