import { ScrapingUpdate, Action } from '../types';
import { MeliScraper } from './scrapers/meli';
import { FalabellaScraper } from './scrapers/falabella';

console.log('PrecioScout Content Script Loaded');

chrome.runtime.onMessage.addListener(async (message: ScrapingUpdate) => {
    if (message.action === 'START_SCRAPING') {
        const url = window.location.href;
        console.log('Content Script: Iniciando scraping para:', message.keywordId);
        
        let scraper;
        if (url.includes('mercadolibre.com.pe')) {
            scraper = new MeliScraper(message.keywordId, message.keywordId);
        } else if (url.includes('falabella.com.pe')) {
            scraper = new FalabellaScraper(message.keywordId, message.keywordId);
        }

        if (scraper) {
            try {
                const products = await scraper.scrape();
                chrome.runtime.sendMessage({
                    action: 'SCRAPING_DONE' as Action,
                    keywordId: message.keywordId,
                    products
                } as ScrapingUpdate);
            } catch (error) {
                chrome.runtime.sendMessage({
                    action: 'SCRAPING_ERROR' as Action,
                    keywordId: message.keywordId,
                    error: String(error)
                } as ScrapingUpdate);
            }
        }
    }
});

const init = () => {
    const url = window.location.href;
    console.log('Monitoring price on:', url);
};

init();
