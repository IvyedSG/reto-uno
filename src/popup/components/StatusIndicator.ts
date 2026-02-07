/**
 * StatusIndicator - Status display utilities for keywords
 */

import { KeywordStatus } from '../../shared/types/product.types';
import { ICONS } from './Icons';

/**
 * Get CSS class for keyword status
 */
export function getStatusClass(status: KeywordStatus): string {
  const classes: Record<KeywordStatus, string> = {
    [KeywordStatus.RUNNING]: 'status-running',
    [KeywordStatus.DONE]: 'status-done',
    [KeywordStatus.ERROR]: 'status-error',
    [KeywordStatus.CANCELLED]: 'status-cancelled',
    [KeywordStatus.IDLE]: 'status-idle'
  };
  return classes[status] || 'status-idle';
}

/**
 * Get icon for keyword status
 */
export function getStatusIcon(status: KeywordStatus): string {
  const icons: Record<KeywordStatus, string> = {
    [KeywordStatus.RUNNING]: ICONS.spinner,
    [KeywordStatus.DONE]: ICONS.check,
    [KeywordStatus.ERROR]: ICONS.error,
    [KeywordStatus.CANCELLED]: ICONS.cancel,
    [KeywordStatus.IDLE]: ICONS.pause
  };
  return icons[status] || ICONS.pause;
}

/**
 * Get display text for keyword status
 */
export function getStatusText(status: KeywordStatus): string {
  const texts: Record<KeywordStatus, string> = {
    [KeywordStatus.RUNNING]: 'Ejecutando...',
    [KeywordStatus.DONE]: 'Completado',
    [KeywordStatus.ERROR]: 'Error',
    [KeywordStatus.CANCELLED]: 'Cancelado',
    [KeywordStatus.IDLE]: 'Idle'
  };
  return texts[status] || 'Idle';
}

/**
 * Render full status badge
 */
export function renderStatusBadge(status: KeywordStatus): string {
  return `<span class="status-badge ${getStatusClass(status)}">${getStatusIcon(status)} ${getStatusText(status)}</span>`;
}
