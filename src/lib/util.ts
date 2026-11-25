export const pad2 = (n: number) => String(n).padStart(2, '0');
export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const parse = (s: string) => new Date(s + 'T00:00:00');
export const dayDiff = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
export const addDays = (s: string, n: number): string => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
export const shuffle = <T,>(a: readonly T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
/** djb2 — быстрый нестойкий хеш для коротких ключей (кэш ИИ использует SHA-256, см. lib/ai.ts). */
export const hash = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const fmtTime = (s: number): string => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
};
export const countWords = (text: string): number => (text.match(/[A-Za-z']+/g) || []).length;
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
