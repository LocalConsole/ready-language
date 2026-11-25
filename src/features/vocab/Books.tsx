import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { useProgress } from '@/store/progress';
import { BOOKS } from '@/data/books';
import { toast } from '@/store/ui';
import { uid } from '@/lib/util';
import { t } from '@/i18n';
import type { BookEntry } from '@/types';

export function parseWords(txt: string): BookEntry[] {
  let page = 1;
  const out: BookEntry[] = [];
  for (const raw of txt.split(/\r?\n/)) {
    const ln = raw.trim();
    if (!ln) continue;
    const pm = ln.match(/^(?:#|p\.?|стр\.?|page)\s*(\d+)/i);
    if (pm && ln.length < 14) {
      page = +pm[1];
      continue;
    }
    const parts = ln.split(/\s+[-–—]\s+|\t|;|\|/).map((x) => x.trim());
    if (parts.length < 2 || !parts[0]) continue;
    const pg = ln.match(/^\[(\d+)\]/);
    out.push({ id: 'b_' + uid(), w: parts[0].replace(/^\[\d+\]\s*/, ''), tr: parts[1], def: parts[2] || '', page: pg ? +pg[1] : page });
  }
  return out;
}

export default function Books() {
  const nav = useNavigate();
  const books = useProgress((s) => s.books);
  const homework = useProgress((s) => s.homework);
  const addBookWords = useProgress((s) => s.addBookWords);
  const addHomework = useProgress((s) => s.addHomework);
  const [bk, setBk] = useState(BOOKS[0].id);
  const [txt, setTxt] = useState('');
  const [hb, setHb] = useState('');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(5);
  const hbook = hb || books[0]?.id || '';

  const add = () => {
    const ents = parseWords(txt);
    if (!ents.length) return toast(t('Не нашёл строк «слово - перевод»'));
    addBookWords(bk, BOOKS.find((b) => b.id === bk)?.title || bk, ents);
    toast(t('Добавлено слов: {n}', { n: ents.length }));
    setTxt('');
  };
  const lib = BOOKS.map((b) => {
    const own = books.find((x) => x.id === b.id);
    const n = own?.entries.length || 0;
    const pg = own && n ? [Math.min(...own.entries.map((e) => e.page)), Math.max(...own.entries.map((e) => e.page))] : null;
    return { b, n, pg };
  });
  return (
    <>
      <div className="row"><Link className="btn alt sm" to="/vocab">←</Link><h1 className="sp" style={{ margin: 0 }}>📕 {t('Книги и домашки')}</h1></div>
      <div className="card">
        <Mood state="board" text={<>{t('Я не храню тексты защищённых книг — добавь слова сам (из своей копии) со страницами. Формат')}: <code>#12</code> — {t('номер страницы, затем строки')} <code>{t('слово - перевод - определение')}</code>.</>} />
        <table className="tbl" style={{ marginTop: '.6rem' }}><tbody>
          {lib.map(({ b, n, pg }) => (
            <tr key={b.id}><td><b>{t(b.title)}</b> <span className={`pill ${b.exam}`}>{b.exam}</span></td><td>{n} {t('слов')}{pg ? ` · ${t('стр.')} ${pg[0]}–${pg[1]}` : ''}</td></tr>
          ))}
        </tbody></table>
      </div>
      <div className="card">
        <h3>{t('Добавить слова из книги')}</h3>
        <label htmlFor="bk">{t('Книга')}</label>
        <select id="bk" value={bk} onChange={(e) => setBk(e.target.value)}>{BOOKS.map((b) => <option key={b.id} value={b.id}>{t(b.title)}</option>)}</select>
        <label htmlFor="bt">{t('Слова (или загрузи .txt)')}</label>
        <textarea id="bt" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={'#12\nabandon - покидать - to leave completely\nacquire - приобретать\n#13\n…'} style={{ minHeight: 140 }} />
        <div className="row" style={{ marginTop: '.5rem' }}>
          <input type="file" aria-label={t('Загрузить файл')} accept=".txt,.csv,.md" style={{ width: 'auto' }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) setTxt(await f.text()); }} />
          <span className="sp" />
          <button className="btn" id="badd" onClick={add}>{t('Добавить')}</button>
        </div>
      </div>
      <div className="card">
        <h3>{t('Поставить домашку')}</h3>
        <div className="row">
          <select aria-label={t('Книга')} id="hb" value={hbook} onChange={(e) => setHb(e.target.value)} style={{ width: 'auto' }}>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            {!books.length && <option value="">{t('— сначала добавь слова —')}</option>}
          </select>
          {t('стр.')} <input type="number" aria-label={t('С страницы')} id="hf" value={from} min={1} onChange={(e) => setFrom(+e.target.value)} style={{ width: 80 }} /> – <input type="number" aria-label={t('По страницу')} id="ht" value={to} min={1} onChange={(e) => setTo(+e.target.value)} style={{ width: 80 }} />
          <button className="btn" id="hadd" disabled={!hbook} onClick={() => { if (from > to) return toast(t('Начальная страница больше конечной')); addHomework({ book: hbook, from, to }); }}>{t('Задать')}</button>
        </div>
      </div>
      <div className="card">
        <h3>{t('Мои домашки')}</h3>
        {homework.length ? homework.map((h) => {
          const b = books.find((x) => x.id === h.book);
          const n = b ? b.entries.filter((e) => e.page >= h.from && e.page <= h.to).length : 0;
          return (
            <div className="row" key={h.id} style={{ padding: '.4rem 0', borderBottom: '1px solid var(--line)' }} data-testid="hw-row">
              <span>{h.done ? '✅' : '📌'} {t('Выучи слова со стр.')} <b>{h.from}–{h.to}</b> {t('из')} «{b ? b.title : h.book}» ({n})</span>
              <span className="sp" />
              <button className="btn alt sm" onClick={() => nav('/hw/learn/' + h.id)}>{t('Учить')}</button>
              <button className="btn sm" data-testid="hw-exam" onClick={() => nav('/hw/exam/' + h.id)}>{t('Экзамен')}</button>
            </div>
          );
        }) : <p className="mute">{t('Пока нет домашек.')}</p>}
      </div>
    </>
  );
}
