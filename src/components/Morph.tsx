import { t } from '@/i18n';

const PRE: Record<string, string> = { un: 'не', re: 'снова', inter: 'между', sub: 'под', pre: 'до', dis: 'не/разъединять', mis: 'ошибочно', over: 'сверх', under: 'под', in: 'не/в', im: 'не/в', ex: 'из', de: 'вниз/от', con: 'вместе', pro: 'вперёд', trans: 'через' };
const SUF: Record<string, string> = { tion: 'сущ. (действие)', sion: 'сущ. (действие)', ment: 'сущ. (результат)', ness: 'сущ. (качество)', able: 'можно сделать', ible: 'можно сделать', ive: 'прил. (склонный)', ize: 'гл. (делать)', ise: 'гл. (делать)', ate: 'гл.', ify: 'гл. (делать)', ous: 'прил. (полный)', ity: 'сущ. (качество)', al: 'прил.', ful: 'полный', less: 'без' };
const SUFPOS: Record<string, string> = { tion: 'n', sion: 'n', ment: 'n', ness: 'n', ity: 'n', able: 'adj', ible: 'adj', ive: 'adj', ous: 'adj', al: 'adj', ful: 'adj', less: 'adj', ize: 'v', ise: 'v', ify: 'v', ate: 'v' };

export function morphParts(w: string, pos?: string) {
  const lw = w.toLowerCase();
  const p = Object.keys(PRE).sort((a, b) => b.length - a.length).find((x) => lw.startsWith(x) && lw.length > x.length + 3 && x.length >= 2);
  const s = Object.keys(SUF).sort((a, b) => b.length - a.length).find((x) => lw.endsWith(x) && lw.length > x.length + 3 && (!pos || SUFPOS[x] === pos));
  return p || s ? { p, s } : null;
}

/** Подсказка о приставке/суффиксе слова (🧩 un- + корень + -able). */
export function Morph({ word, pos }: { word: string; pos?: string }) {
  const m = morphParts(word, pos);
  if (!m) return null;
  return (
    <span className="morph">
      🧩 {t('возможно')}: {m.p && <><b>{m.p}-</b> ({t(PRE[m.p])})</>}
      {m.p && m.s ? ' + ' + t('корень') + ' + ' : m.p ? ' + ' + t('корень') : ''}
      {m.s && <><b>-{m.s}</b> ({t(SUF[m.s])})</>}
    </span>
  );
}
