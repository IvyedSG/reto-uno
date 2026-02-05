import { StorageManager } from '../utils/storage-manager';

document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
    const addBtn = document.getElementById('add-keyword-btn');
    const keywordsList = document.getElementById('keywords-list');

    // Cargar keywords iniciales
    const renderKeywords = async () => {
        if (!keywordsList) return;
        const keywords = await StorageManager.getKeywords();
        
        if (keywords.length === 0) {
            keywordsList.innerHTML = `<p class="text-xs text-slate-400 text-center py-2 italic">No hay keywords registradas</p>`;
            return;
        }

        keywordsList.innerHTML = keywords.map(k => `
            <div class="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 transition-all">
                <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700">${k.text}</span>
                    <span class="text-[10px] text-slate-400 uppercase font-bold">${k.status} • ${k.productCount} prods</span>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-500" title="Ver estadísticas">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    </button>
                    <button class="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400" title="Eliminar" data-id="${k.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Listeners para eliminar
        keywordsList.querySelectorAll('[data-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    await StorageManager.deleteKeyword(id);
                    renderKeywords();
                }
            });
        });
    };

    const handleAddKeyword = async () => {
        const text = keywordInput.value.trim();
        if (text) {
            await StorageManager.addKeyword(text);
            keywordInput.value = '';
            renderKeywords();
        }
    };

    addBtn?.addEventListener('click', handleAddKeyword);
    keywordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddKeyword();
    });

    // Inicialización
    await renderKeywords();
    console.log('Comparador Popup Inicializado');
});
