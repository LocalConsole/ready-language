import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { WordCards } from './WordCards';
import { useProgress } from '@/store/progress';
import { useAllWords } from '@/lib/hooks';
import { makeVQ } from '@/lib/vocabQuestions';
import { level } from '@/lib/plan';
import { shuffle } from '@/lib/util';
import { t } from '@/i18n';
import type { Word } from '@/types';

/** Учёба и экзамен по словам книги. Сложность экзамена зависит от уровня: слово→перевод, определение→слово, ввод/предложение. */
export default function Homework() {
  const { mode, id } = useParams();
  const hw = useProgress((s) => s.homework.find((x) => x.id === id));
  const books = useProgress((s) => s.books);
  const xp = useProgress((s) => s.xp);
  const all = useAllWords();
  const P = useProgress;
  const [res, setRes] = useState<{ ok: number; total: number; errs: number; passed: boolean } | null>(null);
  const [learned, setLearned] = useState(false);

  const ws: Word[] = useMemo(() => {
    const b = books.find((x) => x.id === hw?.book);
    return (b?.entries.filter((e) => hw && e.page >= hw.from && e.page <= hw.to) || []).map((e) => ({ id: e.id, w: e.w, tr: e.tr, def: e.def, pos: '', ex: '', topic: 'book', lvl: 2, custom: true }));
  }, [books, hw]);
  const qs = useMemo(() => {
    const lv = level(xp) < 3 ? 'low' : level(xp) < 6 ? 'mid' : 'high';
    const pool = ws.length >= 4 ? ws : all;
    return shuffle(ws).slice(0, 10).map((w, i) => (lv === 'low' ? makeVQ(w, 'tr', pool) : lv === 'mid' ? makeVQ(w, w.def ? 'def' : 'tr', pool) : i % 3 === 2 ? makeVQ(w, 'sent', pool) : makeVQ(w, w.def ? 'type' : 'dict', pool)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.length]);

  if (!hw) return <Navigate to="/books" replace />;
  if (!ws.length)
    return <div className="card"><Mood state="sad" text={t('В этих страницах нет слов. Добавь их в «Книги».')} /><Link className="btn" to="/books">{t('Назад')}</Link></div>;

  if (mode === 'learn') {
    if (learned) return <div className="card"><Mood state="happy" text={t('Слова добавлены в повторение. Через день проверю!')} /><Link className="btn" to="/books">{t('Ок')}</Link></div>;
    return <WordCards words={shuffle(ws).slice(0, 12)} onDone={() => { ws.forEach((w) => P.getState().srsAdd(w.id)); setLearned(true); }} />;
  }
  if (res)
    return (
      <div className="card" data-testid="hw-result">
        <Mood state={res.passed ? 'celebrate' : 'cheer'} text={`${t('Результат: {ok}/{total}', { ok: res.ok, total: res.total })}. ${res.passed ? t('Домашка зачтена!') : t('Нужно ≥70% — повтори слова и приходи снова.')} ${t('Результаты уже в SRS.')}`} />
        <div className="row">{res.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор')}</Link>}<Link className="btn" to="/books">{t('Ок')}</Link></div>
      </div>
    );
  return (
    <Quiz title={t('Экзамен по домашке')} questions={qs} feedback onDone={(r) => {
      const s = P.getState();
      ws.forEach((w) => s.srsAdd(w.id));
      const fs = s.finishSession(r.results, { title: t('Домашка стр. {a}–{b}', { a: hw.from, b: hw.to }) });
      const passed = fs.ok / fs.total >= 0.7;
      if (passed) s.completeHomework(hw.id);
      s.addXP(10 + fs.ok * 3, 8);
      setRes({ ok: fs.ok, total: fs.total, errs: fs.errs.length, passed });
    }} />
  );
}
