import { StorageManager } from '../utils/storage-manager';
import { PORT_NAMES, ScrapingUpdate, PortMessage, Site, KeywordStatus } from '../types';
import { PortManager } from '../utils/messaging';
import { ProductMatcher } from '../utils/product-matcher';

document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
    const addBtn = document.getElementById('add-keyword-btn');
    const keywordsList = document.getElementById('keywords-list');
    const statsPanel = document.getElementById('stats-panel');
    const statsContent = document.getElementById('stats-content');
    const closeStatsBtn = document.getElementById('close-stats-btn');

    const searchPort = new PortManager();

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.keywords) {
            console.log('Popup: Storage actualizado, refrescando UI');
            renderKeywords();
        }
    });

    const ensureConnected = () => {
        if (!searchPort.isConnected()) {
            searchPort.connect(PORT_NAMES.SEARCH);
            
            searchPort.onMessage((msg: PortMessage) => {
                console.log('Popup: Mensaje del orquestador:', msg);
                handleScrapingUpdate(msg.payload);
            });

            searchPort.onDisconnect(() => {
                console.log('Popup: Orquestador desconectado');
            });
        }
    };

    /**
     * Inicia el scraping para una keyword y sitio específico
     */
    const startScraping = async (keywordId: string, site: Site) => {
        ensureConnected();
        
        const keywords = await StorageManager.getKeywords();
        const keyword = keywords.find(k => k.id === keywordId);
        if (!keyword) return;

        await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.RUNNING);
        await renderKeywords();

        searchPort.postMessage('START_SCRAPING', {
            action: 'START_SCRAPING',
            keywordId,
            keywordText: keyword.text,
            site
        } as ScrapingUpdate);
    };

    /**
     * Cancela el scraping para una keyword
     */
    const cancelScraping = async (keywordId: string) => {
        ensureConnected();
        
        searchPort.postMessage('CANCEL_SCRAPING', {
            action: 'CANCEL_SCRAPING',
            keywordId
        } as ScrapingUpdate);

        await StorageManager.updateKeywordStatus(keywordId, KeywordStatus.CANCELLED);
        await renderKeywords();
    };

    /**
     * Maneja las actualizaciones de scraping
     */
    const handleScrapingUpdate = async (_update: ScrapingUpdate) => {
        // El storage listener ya actualiza la UI
        console.log('Popup: Update recibido');
    };

    /**
     * Muestra las estadísticas para una keyword
     */
    const showStats = async (keywordId: string) => {
        const products = await StorageManager.getProducts(keywordId);
        const keywords = await StorageManager.getKeywords();
        const keyword = keywords.find(k => k.id === keywordId);
        
        if (!keyword || products.length === 0) {
            if (statsContent) statsContent.innerHTML = '<p class="text-slate-500">No hay productos para mostrar estadísticas. Ejecuta primero una búsqueda en Falabella y MercadoLibre.</p>';
            statsPanel?.classList.remove('hidden');
            return;
        }

        const groups = ProductMatcher.groupSimilarProducts(products);
        
        let html = `<p class="font-semibold text-slate-700 mb-2">📊 ESTADÍSTICAS: ${keyword.text}</p>`;
        html += `<p class="text-xs text-slate-500 mb-3">Total: ${products.length} productos analizados</p>`;
        
        if (groups.length === 0) {
            html += '<p class="text-slate-500">No se encontraron grupos similares.</p>';
        } else {
            groups.slice(0, 5).forEach((group, i) => {
                const falProds = group.products.filter(p => p.site === 'Falabella');
                const meliProds = group.products.filter(p => p.site === 'MercadoLibre');
                
                const falPrices = falProds.map(p => p.priceNumeric).filter((p): p is number => p !== null);
                const meliPrices = meliProds.map(p => p.priceNumeric).filter((p): p is number => p !== null);
                
                html += `
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p class="font-medium text-slate-700 text-xs mb-2">Grupo ${i + 1}: ${group.name.substring(0, 40)}...</p>
                        ${falProds.length > 0 && falPrices.length > 0 ? `
                            <p class="text-xs text-slate-600">• Falabella: ${falProds.length} productos | S/${Math.min(...falPrices)} - S/${Math.max(...falPrices)}</p>
                        ` : ''}
                        ${meliProds.length > 0 && meliPrices.length > 0 ? `
                            <p class="text-xs text-slate-600">• MercadoLibre: ${meliProds.length} productos | S/${Math.min(...meliPrices)} - S/${Math.max(...meliPrices)}</p>
                        ` : ''}
                        ${falPrices.length > 0 && meliPrices.length > 0 ? `
                            <p class="text-xs font-bold text-emerald-600 mt-1">💰 AHORRO: S/${Math.abs(Math.min(...falPrices) - Math.min(...meliPrices))}</p>
                        ` : ''}
                    </div>
                `;
            });
        }

        if (statsContent) statsContent.innerHTML = html;
        statsPanel?.classList.remove('hidden');
    };

    /**
     * Renderiza la lista de keywords con sus botones
     */
    const renderKeywords = async () => {
        if (!keywordsList) return;
        const keywords = await StorageManager.getKeywords();
        
        if (keywords.length === 0) {
            keywordsList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 opacity-40">
                    <p class="text-xs font-medium text-center text-slate-800">No hay keywords. Agrega una para comenzar.</p>
                </div>`;
            return;
        }

        keywordsList.innerHTML = keywords.map(k => `
            <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl" data-id="${k.id}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-bold text-slate-700">📋 ${k.text}</span>
                    <button class="text-xs text-red-400 hover:text-red-600 delete-btn" data-id="${k.id}">❌</button>
                </div>
                
                <div class="flex flex-wrap gap-1.5 mb-2">
                    <button class="btn-action falabella-btn" data-id="${k.id}" ${k.status === KeywordStatus.RUNNING ? 'disabled' : ''}>
                        🟠 Falabella
                    </button>
                    <button class="btn-action meli-btn" data-id="${k.id}" ${k.status === KeywordStatus.RUNNING ? 'disabled' : ''}>
                        🟡 MercadoLibre
                    </button>
                    <button class="btn-action stats-btn" data-id="${k.id}">
                        📊 Estadísticas
                    </button>
                    ${k.status === KeywordStatus.RUNNING ? `
                        <button class="btn-cancel cancel-btn" data-id="${k.id}">⏹️ Cancelar</button>
                    ` : ''}
                </div>
                
                <div class="flex items-center gap-3 text-[10px]">
                    <span class="px-2 py-0.5 rounded-full ${getStatusClass(k.status)}">${getStatusText(k.status)}</span>
                    <span class="text-slate-400">Productos: ${k.productCount}</span>
                </div>
            </div>
        `).join('');

        // Event listeners
        keywordsList.querySelectorAll('.falabella-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) startScraping(id, 'Falabella');
            });
        });

        keywordsList.querySelectorAll('.meli-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) startScraping(id, 'MercadoLibre');
            });
        });

        keywordsList.querySelectorAll('.stats-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) showStats(id);
            });
        });

        keywordsList.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) cancelScraping(id);
            });
        });

        keywordsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) {
                    await StorageManager.deleteKeyword(id);
                    renderKeywords();
                }
            });
        });
    };

    const getStatusClass = (status: KeywordStatus): string => {
        switch (status) {
            case KeywordStatus.RUNNING: return 'bg-yellow-100 text-yellow-700 animate-pulse';
            case KeywordStatus.DONE: return 'bg-green-100 text-green-700';
            case KeywordStatus.ERROR: return 'bg-red-100 text-red-700';
            case KeywordStatus.CANCELLED: return 'bg-gray-100 text-gray-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getStatusText = (status: KeywordStatus): string => {
        switch (status) {
            case KeywordStatus.RUNNING: return '⏳ Ejecutando...';
            case KeywordStatus.DONE: return '✅ Completado';
            case KeywordStatus.ERROR: return '❌ Error';
            case KeywordStatus.CANCELLED: return '⏹️ Cancelado';
            default: return '⏸️ Idle';
        }
    };

    /**
     * Agrega una nueva keyword
     */
    const handleAddKeyword = async () => {
        const text = keywordInput.value.trim();
        if (text) {
            await StorageManager.addKeyword(text);
            keywordInput.value = '';
            await renderKeywords();
        }
    };

    // Event Listeners
    addBtn?.addEventListener('click', handleAddKeyword);
    keywordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddKeyword();
    });
    closeStatsBtn?.addEventListener('click', () => {
        statsPanel?.classList.add('hidden');
    });

    // Carga inicial
    await renderKeywords();
    console.log('Comparador Popup Inicializado');
});
