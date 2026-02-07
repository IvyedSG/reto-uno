import { ContentBridge } from '@/content/content-bridge';
import { FalabellaScraper } from '@/content/scrapers/falabella-scraper';

ContentBridge.listen('Falabella', (kw, id, max) => new FalabellaScraper(kw, id, max));
