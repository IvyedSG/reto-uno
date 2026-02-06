import { ScrapingUpdate, Action } from '../types';
import { FalabellaScraper } from './scrapers/falabella';

console.log('[Falabella Content Script] Loaded');

chrome.runtime.onMessage.addListener(async (message: ScrapingUpdate) => {
    console.log('[Falabella] Mensaje recibido:', message);
    
    if (message.action === 'START_SCRAPING' && message.keywordText) {
        console.log('[Falabella] Iniciando scraping para keyword:', message.keywordText);
        
        const scraper = new FalabellaScraper(message.keywordText, message.keywordId);
        
        try {
            const products = await scraper.scrape();
            console.log('[Falabella] Scraping completado:', products.length, 'productos');
            
            chrome.runtime.sendMessage({
                action: 'SCRAPING_DONE' as Action,
                keywordId: message.keywordId,
                products
            } as ScrapingUpdate);
        } catch (error) {
            console.error('[Falabella] Error en scraping:', error);
            chrome.runtime.sendMessage({
                action: 'SCRAPING_ERROR' as Action,
                keywordId: message.keywordId,
                error: String(error)
            } as ScrapingUpdate);
        }
    }
});
