import { ContentBridge } from './content-bridge';
import { MercadoLibreScraper } from './scrapers/mercadolibre-scraper';

ContentBridge.listen('MercadoLibre', (kw, id, max) => new MercadoLibreScraper(kw, id, max));
