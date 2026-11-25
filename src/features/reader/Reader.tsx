import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Quiz } from '@/components/Quiz';
import { MishaLoader, Mood } from '@/components/Mascot';
import { Bar } from '@/components/ui';
import { Morph as WordMorph } from '@/components/Morph';
import { db } from '@/lib/db';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { useWordIndex } from '@/lib/hooks';
import { lemma } from '@/lib/words';
import { simplify, makeQuestions, wordInfo, type WordInfo } from '@/lib/aiTasks';
import { speak } from '@/lib/fx';
import { toast } from '@/store/ui';
import { t } from '@/i18n';
import type { Question, Word } from '@/types';

const TOK = /([A-Za-z][A-Za-z'’-]*)|([^A-Za-z]+)/g;

const Para = memo(function Para({ text, pi, bm, onBm, status, onWord }: { text: string; pi: number; bm: boolean; onBm: (i: number) => void; status: (w: string) => string; onWord: (w: string) => void }) {
  const parts = useMemo(() => [...text.matchAll(TOK)].map((m) => ({ w: m[1], o: m[2] })), [text]);
  return (
    <p data-p={pi}>
      {parts.map((p, i) =>
        p.w ? (
          <span key={i} className={`w ${status(p.w)}`} role="button" tabIndex={0} onClick={() => onWord(p.w)} onKeyDown={(e) => e.key === 'Enter' && onWord(p.w)}>{p.w}</span>
        ) : (
          p.o
        ),
      )}{' '}
      <button className="btn alt sm" aria-label={t('Закладка')} style={{ padding: '0 .3rem' }} onClick={() => onBm(pi)}>{bm ? '🔖' : '＋'}</button>
    </p>
  );
});

export default function Reader() {
  const { id = '' } = useParams();
  const builtin = useData((s) => s.D?.readingTexts) || [];
  const userT = useLiveQuery(async () => (await db.texts.get(id)) ?? null, [id]);
  const T = builtin.find((x) => x.id === id) || (userT ?? null);
  if (!T) return userT === null ? <Navigate to="/reader" replace /> : null;
  return <View key={id} id={id} title={T.title} text={T.text} />;
}

function View({ id, title, text }: { id: string; title: string; text: string }) {
  const idx = useWordIndex();
  const questions = useData((s) => s.D?.questions) || [];
  const cards = useProgress((s) => s.cards);
  const bms = useProgress((s) => s.bookmarks[id]);
  const setBookmark = useProgress((s) => s.setBookmark);
  const setReadPos = useProgress((s) => s.setReadPos);
  const startPos = useProgress((s) => s.readPos[id] || 0);
  const [shown, setShown] = useState(text);
  const [simpl, setSimpl] = useState(false);
  const [fs, setFs] = useState(1.15);
  const [lh, setLh] = useState(1.9);
  const [sepia, setSepia] = useState(false);
  const [prog, setProg] = useState(startPos);
  const [word, setWord] = useState<string | null>(null);
  const [qs, setQs] = useState<Question[] | null | 'none'>(null);
  const [qDone, setQDone] = useState<{ ok: number; total: number; errs: number } | null>(null);
  const [busy, setBusy] = useState('');
  const timer = useRef<number>(0);

  const status = (w: string) => {
    const lw = lemma(idx, w);
    const c = lw && cards[lw.id];
    return c ? (c.reps >= 2 ? 'known' : 'unk') : '';
  };
  const paras = useMemo(() => shown.split(/\n+/).filter(Boolean), [shown]);
  const onBm = (i: number) => setBookmark(id, i);

  useEffect(() => {
    const onScroll = () => {
      const d = document.documentElement;
      const p = Math.min(1, d.scrollTop / Math.max(1, d.scrollHeight - innerHeight));
      setProg(Math.max(p, 0));
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setReadPos(id, p), 400);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); clearTimeout(timer.current); };
  }, [id, setReadPos]);

  const doSimplify = async () => {
    setBusy('s');
    const r = await simplify(text);
    setBusy('');
    if (r) { setShown(r); setSimpl(true); toast(t('Упрощённая версия (ИИ)')); } else toast(t('ИИ сейчас недоступен'));
  };
  const doQuestions = async () => {
    setQDone(null);
    let L = questions.filter((q) => q.passage === id);
    if (!L.length) {
      setBusy('q');
      L = (await makeQuestions(text)) || [];
      setBusy('');
    }
    setQs(L.length ? L : 'none');
  };

  return (
    <>
      <div className="row"><Link className="btn alt sm" to="/reader">←</Link><h2 className="sp" style={{ margin: 0 }}>{title}</h2></div>
      <div className="row" style={{ margin: '.6rem 0' }}>
        <label className="small">Aa <input type="range" aria-label={t('Размер шрифта')} min={0.9} max={1.8} step={0.05} value={fs} onChange={(e) => setFs(+e.target.value)} style={{ width: 90 }} /></label>
        <label className="small">≡ <input type="range" aria-label={t('Межстрочный интервал')} min={1.4} max={2.6} step={0.1} value={lh} onChange={(e) => setLh(+e.target.value)} style={{ width: 90 }} /></label>
        <label className="small"><input type="checkbox" checked={sepia} onChange={(e) => setSepia(e.target.checked)} /> {t('сепия')}</label>
        <span className="sp" />
        {simpl ? <button className="btn alt sm" onClick={() => { setShown(text); setSimpl(false); }}>{t('Оригинал')}</button>
          : <button className="btn alt sm" id="simp" disabled={busy === 's'} onClick={doSimplify}>{busy === 's' ? '…' : '🧸 ' + t('Упрощённый текст')}</button>}
        <button className="btn alt sm" id="rq" disabled={busy === 'q'} onClick={doQuestions}>{busy === 'q' ? '…' : '❓ ' + t('Вопросы')}</button>
      </div>
      <Bar value={prog * 100} label={t('Прочитано')} />
      <div className={`reader ${sepia ? 'sepia' : ''}`} data-testid="reader" style={{ ['--rfs' as string]: fs + 'rem', ['--rlh' as string]: lh }}>
        {paras.map((p, i) => <Para key={i + p.slice(0, 8)} text={p} pi={i} bm={!!bms?.includes(i)} onBm={onBm} status={status} onWord={setWord} />)}
      </div>
      {qs === 'none' && <div className="expl">{t('ИИ сейчас недоступен')}. {t('Вопросов для этого текста нет.')}</div>}
      {Array.isArray(qs) && !qDone && (
        <div className="card" data-testid="reader-quiz">
          <Quiz title={t('Вопросы к тексту')} questions={qs} feedback onDone={(r) => {
            const s = useProgress.getState();
            const fs2 = s.finishSession(r.results, { title: t('Вопросы к тексту') });
            s.addXP(5 + fs2.ok * 4, 5);
            setQDone({ ok: fs2.ok, total: fs2.total, errs: fs2.errs.length });
          }} />
        </div>
      )}
      {qDone && (
        <div className="card center" data-testid="reader-quiz-done">
          <Mood state={qDone.ok === qDone.total ? 'celebrate' : 'cheer'} text={`${qDone.ok}/${qDone.total}`} />
          {qDone.errs > 0 && <Link to="/review">{t('Разбор ошибок')}</Link>}
        </div>
      )}
      {word && <WordPopup key={word + Math.random()} raw={word} idx={idx} onClose={() => setWord(null)} />}
    </>
  );
}

function WordPopup({ raw, idx, onClose }: { raw: string; idx: ReturnType<typeof useWordIndex>; onClose: () => void }) {
  const lw = lemma(idx, raw);
  const [ai, setAi] = useState<WordInfo | null>(null);
  const [loading, setLoading] = useState(!lw);
  const [own, setOwn] = useState('');
  const inSrs = useProgress((s) => (lw ? !!s.cards[lw.id] : false));
  useEffect(() => {
    if (lw) return;
    let off = false;
    wordInfo(raw).then((r) => { if (!off) { setAi(r); setLoading(false); } });
    return () => { off = true; };
  }, [raw, lw]);
  const info = lw ? { w: lw.w, tr: lw.tr, def: lw.def, pos: lw.pos, ex: lw.ex, ipa: '', mn: '' } : ai ? { w: raw.toLowerCase(), tr: ai.tr, def: ai.def, pos: ai.pos, ex: ai.ex, ipa: ai.ipa, mn: ai.mnemonic } : null;
  const add = () => {
    const s = useProgress.getState();
    let id = lw?.id;
    if (!lw) {
      const w: Word = { id: 'c_' + raw.toLowerCase(), w: raw.toLowerCase(), tr: info?.tr || own || '?', def: info?.def || '', pos: info?.pos || '', ex: info?.ex || '', topic: 'custom', lvl: 2, custom: true };
      s.addCustomWord(w);
      id = w.id;
    }
    s.srsAdd(id!);
    toast(t('Добавлено в мои слова'));
    onClose();
  };
  return (
    <div className="pop reader-pop" role="dialog" aria-label={t('Слово')} data-testid="word-popup">
      {loading ? <><div className="row"><span className="small mute sp">{raw}…</span><button className="btn alt sm" aria-label={t('Закрыть')} data-testid="pop-close" onClick={onClose}>✕</button></div><MishaLoader className="sm" /></> : (
        <>
          <div className="row">
            <h2 style={{ margin: 0 }}>{info ? info.w : raw}</h2>
            <span className="small mute">{info?.ipa}</span><span className="small mute">{info?.pos}</span>
            <span className="sp" />
            <button className="btn alt sm" aria-label={t('Произнести')} onClick={() => speak(raw, { rate: 0.8 })}>🔊</button>
            <button className="btn alt sm" aria-label={t('Закрыть')} data-testid="pop-close" onClick={onClose}>✕</button>
          </div>
          {info ? (
            <>
              <p><b data-testid="pop-tr">{info.tr}</b><br />{info.def}{info.ex && <><br /><i className="mute">{info.ex}</i></>}</p>
              {info.mn && <p className="small">💡 {info.mn}</p>}
              <p className="small"><WordMorph word={info.w} pos={info.pos} /></p>
              <button className="btn" data-testid="pop-add" disabled={inSrs} onClick={add}>{inSrs ? '✓ ' + t('В моих словах') : '＋ ' + t('Добавить слово')}</button>
            </>
          ) : (
            <>
              <p className="mute">{t('ИИ сейчас недоступен')}. {t('Слова нет в локальном словаре.')}</p>
              <input type="text" aria-label={t('Свой перевод')} placeholder={t('Свой перевод')} value={own} onChange={(e) => setOwn(e.target.value)} />
              <p><button className="btn" data-testid="pop-add" onClick={add}>＋ {t('Добавить слово')}</button> <a className="btn alt" target="_blank" rel="noopener noreferrer" href={'https://dictionary.cambridge.org/dictionary/english-russian/' + encodeURIComponent(raw.toLowerCase())}>Cambridge ↗</a></p>
            </>
          )}
        </>
      )}
    </div>
  );
}
