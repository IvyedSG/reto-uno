import { ScrapingUpdate, Action } from '../types';
import { FalabellaScraper } from './scrapers/falabella';

console.log('[Falabella Content Script] Loaded');

/**
 * Listener para mensajes del background script.
 * NOTA: Para async operations, debemos retornar true para mantener el canal abierto.
 */
chrome.runtime.onMessage.addListener((message: ScrapingUpdate, _sender, sendResponse) => {
    console.log('[Falabella] Mensaje recibido:', message);
    
    if (message.action === 'START_SCRAPING' && message.keywordText) {
        console.log('[Falabella] Iniciando scraping para keyword:', message.keywordText);
        
        // Ejecutar scraping de forma asíncrona
        (async () => {
            const maxProducts = message.maxProducts || 60;
            const scraper = new FalabellaScraper(message.keywordText!, message.keywordId!, maxProducts);
            
            try {
                const products = await scraper.scrape();
                console.log('[Falabella] Scraping completado:', products.length, 'productos');
                
                // Enviar resultado al background
                chrome.runtime.sendMessage({
                    action: 'SCRAPING_DONE' as Action,
                    keywordId: message.keywordId,
                    site: 'Falabella',
                    products
                } as ScrapingUpdate);
                
                sendResponse({ success: true, count: products.length });
            } catch (error) {
                console.error('[Falabella] Error en scraping:', error);
                
                chrome.runtime.sendMessage({
                    action: 'SCRAPING_ERROR' as Action,
                    keywordId: message.keywordId,
                    site: 'Falabella',
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
