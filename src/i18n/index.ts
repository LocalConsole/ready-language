import type { Lang } from '@/types';
import { EN } from './en';
import { UZ_EXTRA } from './uzExtra';
import { trUz } from './uz';

let lang: Lang = 'ru';
export const getLang = (): Lang => lang;
export const applyLang = (l: Lang) => {
  lang = l;
};

const fill = (s: string, p?: Record<string, string | number>) =>
  p ? s.replace(/\{(\w+)\}/g, (_, k) => (k in p ? String(p[k]) : `{${k}}`)) : s;

/**
 * Перевод строки интерфейса. Ключ — русский текст (он же значение для ru).
 * Плейсхолдеры: t('Слово {n} из {total}', { n: 1, total: 5 }).
 */
export function t(ru: string, p?: Record<string, string | number>): string {
  if (lang === 'ru') return fill(ru, p);
  if (lang === 'en') return fill(EN[ru] ?? ru, p);
  const x = UZ_EXTRA[ru];
  return x !== undefined ? fill(x, p) : trUz(fill(ru, p));
}

/** Плюрализация для ru; для en/uz — простая форма. forms = [1, 2-4, 5+] */
export function plural(n: number, forms: [string, string, string]): string {
  if (lang !== 'ru') return lang === 'en' ? (n === 1 ? forms[0] : forms[2]) : forms[0];
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
