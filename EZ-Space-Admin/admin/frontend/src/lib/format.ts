export const n = (value: unknown): number => Number(value) || 0;

export const nf = (value: unknown): string => n(value).toLocaleString('vi-VN');

export const money = (value: unknown): string => `${nf(value)} ₫`;

export const dt = (value: unknown): string =>
  value ? String(value).replace('T', ' ').slice(0, 19) : '—';

export const timeOnly = (value: unknown): string =>
  value ? String(value).slice(0, 5) : '—';

export function formatVnDateShort(value: unknown): string {
  return String(value ?? '')
    .slice(0, 10)
    .split('-')
    .reverse()
    .join('/');
}

