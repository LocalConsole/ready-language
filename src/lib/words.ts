import type { Book, Word } from '@/types';

export type WordIndex = Record<string, Word>;

export function buildIndex(base: Word[], custom: Word[], books: Book[]): WordIndex {
  const m: WordIndex = {};
  const add = (w: Word) => {
    m[w.w.toLowerCase()] = w;
  };
  base.forEach(add);
  custom.forEach(add);
  books.forEach((b) => b.entries.forEach((e) => add({ id: e.id, w: e.w, tr: e.tr, def: e.def || '', pos: '', ex: '', topic: 'book', lvl: 2, custom: true, page: e.page })));
  return m;
}
export const wordById = (idx: WordIndex, id: string): Word | undefined => Object.values(idx).find((w) => w.id === id);

/** Находит слово в словаре по словоформе: books → book, studied → study, и т.п. */
export function lemma(idx: WordIndex, raw: string): Word | null {
  const w = raw.toLowerCase().replace(/[^a-z'-]/g, '').replace(/'s$/, '');
  if (!w) return null;
  if (idx[w]) return idx[w];
  const tries = [
    w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'),
    w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/ly$/, ''), w.replace(/ied$/, 'y'), w.replace(/(.)\1ing$/, '$1'),
  ];
  for (const t of tries) if (t !== w && idx[t]) return idx[t];
  return null;
}
