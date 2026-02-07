import { PortManager } from '@/shared/messaging/port-manager';
import { ScrapingOrchestrator } from '@/background/services/scraping-orchestrator';
import { PortHandler } from '@/background/handlers/port-handler';

chrome.runtime.onInstalled.addListener(() => {
});

const messenger = new PortManager();
const orchestrator = new ScrapingOrchestrator(messenger);

const portHandler = new PortHandler(messenger, orchestrator);

portHandler.init();
