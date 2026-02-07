/**
 * KeywordList - Renders keyword cards with action buttons
 */

import { Keyword, KeywordStatus } from '../../shared/types/product.types';
import { Site } from '../../shared/types/scraper.types';
import { ICONS } from './Icons';
import { getStatusClass, getStatusIcon, getStatusText } from './StatusIndicator';

export interface KeywordListHandlers {
  onSearchSite: (keywordId: string, site: Site) => void;
  onCancel: (keywordId: string) => void;
  onStats: (keywordId: string) => void;
  onDelete: (keywordId: string) => void;
}

/**
 * Render empty state when no keywords
 */
function renderEmptyState(): string {
  return `
    <div class="flex flex-col items-center justify-center py-8 opacity-40">
      <p class="text-xs font-medium text-center text-slate-800">No hay keywords. Agrega una para comenzar.</p>
    </div>
  `;
}

/**
 * Render a single keyword card
 */
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
          <div class="flex-1 text-center text-xs text-emerald-600 bg-emerald-50 py-2 rounded-lg flex items-center justify-center gap-2">
            ${ICONS.check}
            <span class="font-medium">Extracción completa</span>
          </div>
        ` : `
          <button class="btn-site btn-falabella search-site-btn flex-1 ${falabellaDone ? 'btn-site-done' : ''}" 
                  data-id="${k.id}" data-site="Falabella" ${falabellaDone ? 'disabled' : ''}>
            ${falabellaDone ? ICONS.check : ICONS.search}
            <span>Falabella</span>
          </button>
          <button class="btn-site btn-meli search-site-btn flex-1 ${mercadoLibreDone ? 'btn-site-done' : ''}" 
                  data-id="${k.id}" data-site="MercadoLibre" ${mercadoLibreDone ? 'disabled' : ''}>
            ${mercadoLibreDone ? ICONS.check : ICONS.search}
            <span>MercadoLibre</span>
          </button>
        `}
      </div>
      
      <div class="flex items-center gap-3 text-[10px]">
        <span class="status-badge ${getStatusClass(k.status)}">${getStatusIcon(k.status)} ${getStatusText(k.status)}</span>
        <span class="text-slate-400">Productos: ${k.productCount}</span>
        ${falabellaDone || mercadoLibreDone ? `
          <span class="text-emerald-500 flex items-center gap-1">
            ${falabellaDone ? '<span class="bg-emerald-100 px-1 rounded text-[9px]">F✓</span>' : ''}
            ${mercadoLibreDone ? '<span class="bg-emerald-100 px-1 rounded text-[9px]">ML✓</span>' : ''}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render keyword list and attach event handlers
 */
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

  // Attach event listeners
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
