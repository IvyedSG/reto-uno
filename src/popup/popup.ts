import { StorageManager } from '../utils/storage-manager';

document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keyword-input') as HTMLInputElement;
    const addBtn = document.getElementById('add-keyword-btn');
    const keywordsList = document.getElementById('keywords-list');

    /**
     * Renderiza la lista de keywords desde el almacenamiento
     */
    const renderKeywords = async () => {
        if (!keywordsList) return;
        const keywords = await StorageManager.getKeywords();
        
        if (keywords.length === 0) {
            keywordsList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 opacity-40">
                    <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p class="text-xs font-medium text-center">No hay búsquedas registradas</p>
                </div>`;
            return;
        }

        keywordsList.innerHTML = keywords.map(k => `
            <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 transition-all">
                <div class="flex flex-col min-w-0">
                    <span class="text-sm font-semibold text-slate-700 truncate">${k.text}</span>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[9px] px-1.5 py-0.5 bg-white border border-slate-100 rounded-md text-slate-400 uppercase font-black tracking-wider">
                            ${k.status}
                        </span>
                        <span class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            ${k.productCount} productos
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500" title="Ver estadísticas">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    </button>
                    <button class="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400 delete-btn" title="Eliminar" data-id="${k.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Listeners individuales para eliminar
        keywordsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    await StorageManager.deleteKeyword(id);
                    renderKeywords();
                }
            });
        });
    };

    /**
     * Gestiona la adición de una nueva keyword
     */
    const handleAddKeyword = async () => {
        const text = keywordInput.value.trim();
        if (text) {
            await StorageManager.addKeyword(text);
            keywordInput.value = '';
            renderKeywords();
        }
    };

    // Event Listeners
    addBtn?.addEventListener('click', handleAddKeyword);
    keywordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddKeyword();
    });

    // Carga inicial
    await renderKeywords();
    console.log('Comparador Popup Inicializado');
});
