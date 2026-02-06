import { ScrapingUpdate, Action } from '../types';
import { MeliScraper } from './scrapers/meli';

console.log('[MercadoLibre Content Script] Loaded');

chrome.runtime.onMessage.addListener(async (message: ScrapingUpdate) => {
    console.log('[MercadoLibre] Mensaje recibido:', message);
    
    if (message.action === 'START_SCRAPING' && message.keywordText) {
        console.log('[MercadoLibre] Iniciando scraping para keyword:', message.keywordText);
        
        const scraper = new MeliScraper(message.keywordText, message.keywordId);
        
        try {
            const products = await scraper.scrape();
            console.log('[MercadoLibre] Scraping completado:', products.length, 'productos');
            
            chrome.runtime.sendMessage({
                action: 'SCRAPING_DONE' as Action,
                keywordId: message.keywordId,
                products
            } as ScrapingUpdate);
        } catch (error) {
            console.error('[MercadoLibre] Error en scraping:', error);
            chrome.runtime.sendMessage({
                action: 'SCRAPING_ERROR' as Action,
                keywordId: message.keywordId,
                error: String(error)
            } as ScrapingUpdate);
        }
    }
});
