import { ScrapingUpdate } from '../types';

console.log('PrecioScout Content Script Loaded');

chrome.runtime.onMessage.addListener((message: ScrapingUpdate) => {
    if (message.action === 'START_SCRAPING') {
        console.log('Content Script: Iniciando scraping para:', message.keywordId);
        // Aquí se llamará a los scrapers específicos según la URL
    }
});

const init = () => {
    const url = window.location.href;
    console.log('Monitoring price on:', url);
};

init();
