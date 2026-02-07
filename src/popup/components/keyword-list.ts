import { Keyword, KeywordStatus } from '../../shared/types/product.types';
import { Site } from '../../shared/types/scraper.types';
import { ICONS } from './icons';
import { getStatusClass, getStatusIcon, getStatusText } from './status-indicator';

export interface KeywordListHandlers {
  onSearchSite: (keywordId: string, site: Site) => void;
  onCancel: (keywordId: string) => void;
  onStats: (keywordId: string) => void;
  onDelete: (keywordId: string) => void;
}

function renderEmptyState(): string {
  return `
    <div class="flex flex-col items-center justify-center py-8 opacity-40">
      <p class="text-xs font-medium text-center text-slate-800">No hay keywords. Agrega una para comenzar.</p>
    </div>
  `;
}

function renderKeywordCard(k: Keyword): string {
  const falabellaDone = k.falabellaDone === true;
  const mercadoLibreDone = k.mercadoLibreDone === true;
  const bothDone = falabellaDone && mercadoLibreDone;

  return `
    <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl" data-id="${k.id}">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          ${ICONS.document}
          ${k.text}
        </span>
        <div class="flex items-center gap-1">
          <button class="btn-icon-stats stats-btn" data-id="${k.id}" title="Ver estadísticas">
            ${ICONS.stats}
          </button>
          <button class="btn-icon-delete delete-btn" data-id="${k.id}" title="Eliminar keyword">
            ${ICONS.delete}
          </button>
        </div>
      </div>
      
      <div class="flex items-center gap-2 mb-2">
        ${k.status === KeywordStatus.RUNNING ? `
          <button class="btn-cancel cancel-btn flex-1 justify-center" data-id="${k.id}">
            ${ICONS.cancel}
            <span>Cancelar</span>
          </button>
        ` : bothDone ? `
          <div class="flex-1 text-center text-xs text-sky-600 bg-sky-50 py-2 rounded-lg flex items-center justify-center gap-2">
            ${ICONS.check}
            <span class="font-medium">Extracción completa</span>
          </div>
        ` : `
          <button class="btn-site btn-falabella search-site-btn flex-1 group ${falabellaDone ? 'btn-site-done' : ''}" 
                  data-id="${k.id}" data-site="Falabella" ${falabellaDone ? 'disabled' : ''}>
            ${falabellaDone ? `<span class="flex items-center gap-1 text-sky-600 font-bold text-[9px]">${ICONS.check} LISTO</span>` : ICONS.falabella}
          </button>
          <button class="btn-site btn-meli search-site-btn flex-1 group ${mercadoLibreDone ? 'btn-site-done' : ''}" 
                  data-id="${k.id}" data-site="MercadoLibre" ${mercadoLibreDone ? 'disabled' : ''}>
            ${mercadoLibreDone ? `<span class="flex items-center gap-1 text-sky-600 font-bold text-[9px]">${ICONS.check} LISTO</span>` : ICONS.meli}
          </button>
        `}
      </div>
      
      <div class="flex items-center gap-3 text-[10px]">
        <span class="status-badge ${getStatusClass(k.status)}">${getStatusIcon(k.status)} ${getStatusText(k.status)}</span>
        <span class="text-slate-400">Productos: ${k.productCount}</span>
        <span class="text-slate-400">Productos: ${k.productCount}</span>
        ${(falabellaDone || mercadoLibreDone) && !bothDone ? `
          <span class="text-sky-500 flex items-center gap-1">
            ${falabellaDone ? `<span class="bg-sky-100 p-0.5 rounded">${ICONS.falabella}</span>` : ''}
            ${mercadoLibreDone ? `<span class="bg-sky-100 p-0.5 rounded">${ICONS.meli}</span>` : ''}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderKeywordList(
  container: HTMLElement,
  keywords: Keyword[],
  handlers: KeywordListHandlers
): void {
  if (keywords.length === 0) {
    container.innerHTML = renderEmptyState();
    return;
  }

  container.innerHTML = keywords.map(renderKeywordCard).join('');

  container.querySelectorAll('.search-site-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      const site = (btn as HTMLElement).dataset.site as Site;
      if (id && site) handlers.onSearchSite(id, site);
    });
  });

  container.querySelectorAll('.stats-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      if (id) handlers.onStats(id);
    });
  });

  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      if (id) handlers.onCancel(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      if (id) handlers.onDelete(id);
    });
  });
}
