import { KeywordStatus } from '@/shared/types/product.types';
import { ICONS } from '@/popup/components/icons';

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

export function renderStatusBadge(status: KeywordStatus): string {
  return `<span class="status-badge ${getStatusClass(status)}">${getStatusIcon(status)} ${getStatusText(status)}</span>`;
}
