import { ContentBridge } from './content-bridge';
import { FalabellaScraper } from './scrapers/falabella-scraper';

ContentBridge.listen('Falabella', (kw, id, max) => new FalabellaScraper(kw, id, max));
