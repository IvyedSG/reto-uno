import { ContentBridge } from '@/content/content-bridge';
import { MercadoLibreScraper } from '@/content/scrapers/mercadolibre-scraper';

ContentBridge.listen('MercadoLibre', (kw, id, max) => new MercadoLibreScraper(kw, id, max));
