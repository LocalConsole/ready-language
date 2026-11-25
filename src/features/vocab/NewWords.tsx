import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuizResult, Word } from '@/types';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { WordCards } from './WordCards';
import { useProgress } from '@/store/progress';
import { useAllWords } from '@/lib/hooks';
import { level } from '@/lib/plan';
import { makeVQ } from '@/lib/vocabQuestions';
import { confetti } from '@/lib/fx';
import { shuffle } from '@/lib/util';
import { t } from '@/i18n';

export default function NewWords() {
  const words = useAllWords();
  const P = useProgress;
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'cards' | 'quiz' | 'done'>('cards');
  const [res, setRes] = useState<{ ok: number; total: number; errs: number } | null>(null);
  const picked = useRef<Word[] | null>(null);

  const ws = useMemo(() => {
    const s = P.getState();
    const lv = level(s.xp) < 3 ? [1, 2] : level(s.xp) < 6 ? [2, 3] : [3];
    return shuffle(words.filter((w) => !s.cards[w.id] && (lv.includes(w.lvl || 2) || Math.random() < 0.2))).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);
  picked.current = ws;

  if (!ws.length && phase !== 'done')
    return (
      <div className="card">
        <Mood state="celebrate" text={t('Ты уже начал учить все слова из базы! Повтори их или добавь свои в «Книги».')} />
        <div className="row"><Link className="btn" to="/vocab/review/any">{t('Повторить')}</Link><Link className="btn alt" to="/vocab">{t('Назад')}</Link></div>
      </div>
    );

  if (phase === 'cards') return <WordCards words={ws} onDone={() => { ws.forEach((w) => P.getState().srsAdd(w.id)); setPhase('quiz'); }} />;
  if (phase === 'quiz')
    return (
      <Quiz title={t('Выбери перевод')} feedback questions={ws.map((w) => makeVQ(w, 'tr', words))} onDone={(r: QuizResult) => {
        const s = P.getState();
        const fs = s.finishSession(r.results, { title: t('Новые слова') });
        s.addXP(8 + fs.ok * 3, 6);
        s.missionDone('words');
        confetti(40);
        setRes({ ok: fs.ok, total: fs.total, errs: fs.errs.length });
        setPhase('done');
      }} />
    );
  return (
    <div className="card" data-testid="new-done">
      <Mood state={res!.ok === res!.total ? 'celebrate' : 'cheer'} text={t('Слова добавлены в повторения. Угадано {ok} из {total}.', { ok: res!.ok, total: res!.total })} />
      <div className="row" style={{ marginTop: '.8rem' }}>
        <button className="btn big" onClick={() => { setRound(round + 1); setPhase('cards'); }}>🌱 {t('Ещё 5 слов')}</button>
        <Link className="btn alt" to="/vocab/review/any">🃏 {t('Повторить')}</Link>
        {res!.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор ошибок')}</Link>}
        <Link className="btn alt" to="/vocab">{t('Назад')}</Link>
      </div>
    </div>
  );
}
