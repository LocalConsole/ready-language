import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mood } from '@/components/Mascot';
import { Bar, PageHead } from '@/components/ui';
import { Morph } from '@/components/Morph';
import { useProgress } from '@/store/progress';
import { useWordIndex } from '@/lib/hooks';
import { dueCards } from '@/lib/srs';
import { wordById } from '@/lib/words';
import { confetti, playSound, speak } from '@/lib/fx';
import { toast } from '@/store/ui';
import { t } from '@/i18n';
import type { Word } from '@/types';

const POS: Record<string, string> = { n: 'существительное', v: 'глагол', adj: 'прилагательное', adv: 'наречие' };

export default function SrsReview() {
  const { any } = useParams();
  const [round, setRound] = useState(0);
  return <Review key={(any || '') + round} any={any} again={() => setRound((r) => r + 1)} />;
}

function Review({ any, again }: { any?: string; again: () => void }) {
  const idx = useWordIndex();
  const P = useProgress;
  const queue = useRef<{ ws: Word[]; early: boolean } | null>(null);
  if (!queue.current) {
    const s = P.getState();
    let ws = dueCards(s.cards, 'word').map((c) => wordById(idx, c.id)).filter(Boolean).slice(0, 15) as Word[];
    let early = false;
    if (!ws.length && any === 'any') {
      early = true;
      ws = Object.values(s.cards).filter((c) => c.kind === 'word').sort((a, b) => a.reps - b.reps || (a.due < b.due ? -1 : 1)).map((c) => wordById(idx, c.id)).filter(Boolean).slice(0, 10) as Word[];
    }
    queue.current = { ws, early };
  }
  const { ws, early } = queue.current;
  const [k, setK] = useState(0);
  const [flip, setFlip] = useState(false);
  const [okc, setOkc] = useState(0);
  const has = useMemo(() => Object.values(P.getState().cards).some((c) => c.kind === 'word'), []); // eslint-disable-line
  const doneRef = useRef(false);

  useEffect(() => { if (early) toast(t('Досрочное повторение — слабые слова в приоритете')); }, [early]);

  const w = ws[k];
  const grade = (q: number) => {
    if (!w || !flip) return;
    P.getState().srsGrade(w.id, q);
    playSound('tap');
    if (q >= 4) setOkc(okc + 1);
    setFlip(false);
    setK(k + 1);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!w) return;
      if (e.key === ' ') { e.preventDefault(); setFlip(true); playSound('flip'); }
      if (flip && ['1', '2', '3', '4'].includes(e.key)) grade([1, 3, 4, 5][+e.key - 1]);
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  });
  useEffect(() => {
    if (ws.length && k >= ws.length && !doneRef.current) {
      doneRef.current = true;
      const s = P.getState();
      s.addXP(5 + ws.length * 2, 5);
      s.missionDone('words');
      confetti(50);
    }
  }, [k, ws.length]); // eslint-disable-line

  if (!ws.length)
    return (
      <div className="card">
        <Mood state={has ? 'celebrate' : 'hello'} text={has ? t('На сегодня всё повторено. Хочешь потренироваться ещё — повтори выученные слова в любой момент.') : t('Пока нечего повторять — сначала выучим первые слова.')} />
        <div className="row" style={{ marginTop: '.8rem' }}>
          {has && <Link className="btn big" to="/vocab/review/any">🃏 {t('Повторить всё равно')}</Link>}
          {has && <Link className="btn alt" to="/vocab/mode/choice">✅ {t('Тест на выбор')}</Link>}
          <Link className={`btn ${has ? 'alt' : 'big'}`} to="/vocab/new">🌱 {t('Выучить 5 новых слов')}</Link>
          <Link className="btn alt" to="/vocab">{t('Назад')}</Link>
        </div>
      </div>
    );
  if (k >= ws.length)
    return (
      <div className="card" data-testid="srs-done">
        <Mood state="celebrate" text={t('Серия пройдена: {ok} из {total} уверенно.', { ok: okc, total: ws.length })} />
        <div className="row" style={{ marginTop: '.8rem' }}>
          <button className="btn big" onClick={again}>🔁 {t('Ещё раз')}</button>
          <Link className="btn alt" to="/vocab/new">🌱 {t('Новые слова')}</Link>
          <Link className="btn alt" to="/vocab">{t('Назад')}</Link>
        </div>
      </div>
    );
  return (
    <>
      <PageHead icon="🃏" title={t('Повторение слов')} sub={t('Вспомни перевод, потом нажми на карточку и честно оцени себя.')} acc="vocab" />
      <div className="row"><b>{t('Слово {n} из {total}', { n: k + 1, total: ws.length })}</b><Bar value={k / ws.length} style={{ flex: 1 }} label={t('Прогресс')} /></div>
      <div style={{ height: '.7rem' }} />
      <div className="fc" data-acc="vocab" role="button" tabIndex={0} aria-label={t('Перевернуть карточку')} data-testid="flashcard" onClick={() => { setFlip(true); playSound('flip'); }} onKeyDown={(e) => e.key === 'Enter' && setFlip(true)}>
        <motion.div animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration: 0.45 }} style={{ transformStyle: 'preserve-3d', position: 'relative', height: '100%' }}>
          <div className="f">
            <small>{t('Что значит это слово?')}</small><b>{w.w}</b><span className="badge">{t(POS[w.pos || ''] || w.pos || '')}</span>
            <button className="btn alt sm" style={{ marginTop: '.7rem' }} onClick={(e) => { e.stopPropagation(); speak(w.w, { rate: 0.8 }); }}>🔊 {t('Послушать')}</button>
            <small style={{ marginTop: '.8rem' }}>👆 {t('нажми, чтобы увидеть ответ')}</small>
          </div>
          <div className="b">
            <small>{t('Перевод')}</small><span className="trb">{w.tr}</span><span>{w.def}</span><i className="small mute">{w.ex}</i><span className="small"><Morph word={w.w} pos={w.pos} /></span>
          </div>
        </motion.div>
      </div>
      {flip && (
        <div data-testid="grade-box">
          <p className="center small mute" style={{ margin: '.8rem 0 .3rem' }}>{t('Как легко вспомнилось?')}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn alt" data-q="1" onClick={() => grade(1)}>😖 {t('Не вспомнил')}<br /><span className="small">{t('повтор завтра')}</span></button>
            <button className="btn alt" data-q="3" onClick={() => grade(3)}>😐 {t('Трудно')}</button>
            <button className="btn" data-q="4" onClick={() => grade(4)}>🙂 {t('Хорошо')}</button>
            <button className="btn ok" data-q="5" onClick={() => grade(5)}>😎 {t('Легко')}</button>
          </div>
        </div>
      )}
      <p className="small mute center">{t('Пробел — перевернуть · клавиши 1–4 — оценка')}</p>
    </>
  );
}
