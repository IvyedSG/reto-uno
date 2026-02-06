import { ScrapingUpdate, Action } from '../types';
import { MeliScraper } from './scrapers/meli';

console.log('[MercadoLibre Content Script] Loaded');

/**
 * Listener para mensajes del background script.
 * NOTA: Para async operations, debemos retornar true para mantener el canal abierto.
 */
chrome.runtime.onMessage.addListener((message: ScrapingUpdate, _sender, sendResponse) => {
    console.log('[MercadoLibre] Mensaje recibido:', message);
    
    if (message.action === 'START_SCRAPING' && message.keywordText) {
        console.log('[MercadoLibre] Iniciando scraping para keyword:', message.keywordText);
        
        // Ejecutar scraping de forma asíncrona
        (async () => {
            const maxProducts = message.maxProducts || 100;
            const scraper = new MeliScraper(message.keywordText!, message.keywordId!, maxProducts);
            
            try {
                const products = await scraper.scrape();
                console.log('[MercadoLibre] Scraping completado:', products.length, 'productos');
                
                // Enviar resultado al background
                chrome.runtime.sendMessage({
                    action: 'SCRAPING_DONE' as Action,
                    keywordId: message.keywordId,
                    site: 'MercadoLibre',
                    products
                } as ScrapingUpdate);
                
                sendResponse({ success: true, count: products.length });
            } catch (error) {
                console.error('[MercadoLibre] Error en scraping:', error);
                
                chrome.runtime.sendMessage({
                    action: 'SCRAPING_ERROR' as Action,
                    keywordId: message.keywordId,
                    site: 'MercadoLibre',
                    error: String(error)
                } as ScrapingUpdate);
                
                sendResponse({ success: false, error: String(error) });
            }
        })();
        
        // Retornar true para mantener el canal abierto para sendResponse asíncrono
        return true;
    }
    
    return false;
});
