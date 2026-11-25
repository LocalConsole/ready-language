import type { Question, Word } from '@/types';
import { pick, shuffle } from './util';
import { t } from '@/i18n';

export type VQMode = 'tr' | 'rev' | 'def' | 'cloze' | 'spell' | 'type' | 'dict' | 'sent';

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Искажения слова для вопроса «найди правильное написание». */
function mutate(w: string): string[] {
  const out = new Set<string>();
  const a = w.split('');
  const V = 'aeiou';
  if (a.length < 4) return [];
  const ops = [
    () => {
      const i = 1 + Math.floor(Math.random() * Math.max(a.length - 3, 1));
      const b = [...a];
      [b[i], b[i + 1]] = [b[i + 1], b[i]];
      return b.join('');
    },
    () => {
      const i = 1 + Math.floor(Math.random() * (a.length - 2));
      const b = [...a];
      b.splice(i, 0, b[i]);
      return b.join('');
    },
    () => {
      const i = 1 + Math.floor(Math.random() * (a.length - 2));
      const b = [...a];
      b.splice(i, 1);
      return b.join('');
    },
    () => {
      const idx = a.map((c, i) => (V.includes(c) && i > 0 ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return w + 'e';
      const i = pick(idx);
      const b = [...a];
      b[i] = pick(V.split('').filter((v) => v !== b[i]));
      return b.join('');
    },
  ];
  let g = 0;
  while (out.size < 3 && g++ < 40) {
    const m = pick(ops)();
    if (m !== w && m.length > 2) out.add(m);
  }
  return [...out];
}

interface Opt {
  t: string;
  right?: boolean;
  why?: string;
}

/** Генератор вопросов по слову. pool — откуда брать неверные варианты. */
export function makeVQ(w: Word, mode: VQMode, pool: Word[]): Question {
  const others = shuffle(pool.filter((x) => x.w !== w.w));
  if (mode === 'def' && !w.def) mode = 'tr';
  if (mode === 'cloze' && !w.ex) mode = 'tr';
  if (mode === 'spell' && w.w.length < 4) mode = 'tr';
  const info = `<b>${esc(w.w)}</b>${w.pos ? ' (' + esc(w.pos) + ')' : ''} — ${esc(w.tr)}.${w.def ? ' ' + esc(w.def) + '.' : ''}${w.ex ? ' ' + t('Пример') + ': <i>' + esc(w.ex) + '</i>' : ''}`;
  const base: Question = {
    id: `v:${w.id}:${mode}`, skill: 'vocab', topic: 'words', lvl: w.lvl || 2, exam: 'ielts', src: 'Словарь', expl: info, wid: w.id,
    typ: 'mcq', q: '', opts: [], a: 0, wrong: [],
  };
  const build = (q: string, opts: Opt[]): Question => {
    const arr = shuffle(opts);
    return { ...base, q, opts: arr.map((o) => o.t), a: arr.findIndex((o) => o.right), wrong: arr.map((o) => (o.right ? '' : o.why || '')) };
  };
  const right = (s: string): Opt => ({ t: s, right: true });
  switch (mode) {
    case 'rev':
      return build(t('Как по-английски: «{w}»?', { w: w.tr }), [right(w.w), ...others.slice(0, 3).map((x) => ({ t: x.w, why: t('«{w}» означает: {tr}.', { w: x.w, tr: x.tr }) }))]);
    case 'tr':
      return build(t('Что означает слово «{w}»?', { w: w.w }), [
        right(w.tr),
        ...others.filter((x) => x.tr !== w.tr).slice(0, 3).map((x) => ({ t: x.tr, why: t('«{tr}» — это перевод слова «{w}».', { tr: x.tr, w: x.w }) })),
      ]);
    case 'def':
      return build(w.def!, [right(w.w), ...others.filter((x) => x.def).slice(0, 3).map((x) => ({ t: x.w, why: t('«{w}» означает: {tr}.', { w: x.w, tr: x.tr }) }))]);
    case 'cloze': {
      const stem = w.w.slice(0, Math.max(4, w.w.length - 3));
      const sent = w.ex!.replace(new RegExp(escRe(stem) + '\\w*', 'i'), '_____');
      return build(sent, [right(w.w), ...others.filter((x) => x.pos === w.pos || !w.pos).slice(0, 3).map((x) => ({ t: x.w, why: t('«{w}» ({tr}) не подходит по смыслу.', { w: x.w, tr: x.tr }) }))]);
    }
    case 'spell': {
      const m = mutate(w.w);
      if (m.length < 2) return makeVQ(w, 'tr', pool);
      return build(t('Выбери правильное написание:'), [right(w.w), ...m.map((x) => ({ t: x, why: t('Неверное написание. Правильно: {w}.', { w: w.w }) }))]);
    }
    case 'type':
      return { ...base, typ: 'type', q: w.def || w.tr, hint: w.tr, answer: w.w, opts: [], a: -1, wrong: [], lvl: 3 };
    case 'dict':
      return { ...base, typ: 'type', audio: w.w, q: t('Послушай слово и напиши его'), answer: w.w, opts: [], a: -1, wrong: [], lvl: 3, hint: w.tr };
    case 'sent':
      return { ...base, typ: 'sent', q: t('Составь предложение со словом «{w}» ({tr})', { w: w.w, tr: w.tr }), answer: w.w, opts: [], a: -1, wrong: [], lvl: 3 };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
