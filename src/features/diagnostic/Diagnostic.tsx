import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QResult, Question, QuizResult } from '@/types';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { Bar } from '@/components/ui';
import { useData, type Dataset } from '@/data';
import { useProgress } from '@/store/progress';
import { useAllWords, useGoals } from '@/lib/hooks';
import { makeVQ } from '@/lib/vocabQuestions';
import { cefr, daysLeft, minutesPerDay, toBand, toSat } from '@/lib/plan';
import { confetti } from '@/lib/fx';
import { shuffle } from '@/lib/util';
import { t } from '@/i18n';
import type { Word } from '@/types';

interface Stage { id: string; title: string; n?: number; ad?: string; fixed?: string[]; once?: boolean }

/** Адаптивный выбор: после верного ответа сложность растёт, после неверного — падает. Результат по индексу кэшируется (StrictMode-safe). */
function makeNext(st: Stage, D: Dataset, words: Word[]) {
  let L = 2;
  const used = new Set<string>();
  const cache: Question[] = [];
  const pool = st.ad === 'vocab' ? [] : D.questions.filter((x) => x.skill === st.ad);
  return (res: QResult[], i: number): Question | null => {
    if (cache[i]) return cache[i];
    if (i > 0) L = Math.max(1, Math.min(3, L + (res[res.length - 1].ok ? 1 : -1)));
    let q: Question | null = null;
    if (st.ad === 'vocab') {
      const free = words.filter((w) => !used.has(w.id));
      const w = shuffle(free.filter((x) => x.lvl === L))[0] || shuffle(free)[0];
      if (!w) return null;
      used.add(w.id);
      q = makeVQ(w, L === 1 ? 'tr' : L === 2 ? 'def' : 'spell', words);
    } else {
      const c = pool.filter((x) => !used.has(x.id)).sort((a, b) => Math.abs(a.lvl - L) - Math.abs(b.lvl - L) || Math.random() - 0.5)[0];
      if (!c) return null;
      used.add(c.id);
      q = c;
    }
    cache[i] = q;
    return q;
  };
}

function StageQuiz({ st, D, words, onDone }: { st: Stage; D: Dataset; words: Word[]; onDone: (r: QuizResult) => void }) {
  const next = useMemo(() => (st.fixed ? undefined : makeNext(st, D, words)), [st, D, words]);
  const questions = useMemo(() => (st.fixed ? st.fixed.map((id) => D.qById[id]).filter(Boolean) : undefined), [st, D]);
  return <Quiz key={st.id} title={t('Диагностика') + ' · ' + st.title} feedback={false} once={st.once} next={next} questions={questions} total={st.n} onDone={onDone} />;
}

export default function Diagnostic() {
  const D = useData((s) => s.D);
  const g = useGoals();
  const words = useAllWords().filter((w) => !w.custom);
  const store = useProgress;
  const stages = useMemo<Stage[]>(
    () => [
      { id: 'vocab', title: 'Vocabulary', n: 6, ad: 'vocab' },
      { id: 'grammar', title: 'Grammar', n: 6, ad: 'grammar' },
      ...(g.ielts ? [{ id: 'reading', title: 'Reading', fixed: ['r1', 'r2', 'r3', 'r4', 'r5'] }, { id: 'listening', title: 'Listening', fixed: ['l1q1', 'l1q2', 'l1q3', 'l1q4'], once: true }] : []),
      ...(g.sat ? [{ id: 'rw', title: 'SAT Reading & Writing', n: 5, ad: 'rw' }, { id: 'math', title: 'SAT Math', n: 5, ad: 'math' }] : []),
    ],
    [g.ielts, g.sat],
  );
  const [idx, setIdx] = useState(-1); // -1 = вступление, stages.length = итог
  const per = useRef<Record<string, QResult[]>>({});
  const [summary, setSummary] = useState<{ sk: Record<string, number>; weak: string[]; cefr: string; band: number | null; sat: number | null; errs: number } | null>(null);

  const done = (st: Stage, r: QuizResult) => {
    per.current[st.id] = r.results;
    if (idx < stages.length - 1) return setIdx(idx + 1);
    const sk: Record<string, number> = {};
    for (const [k, res] of Object.entries(per.current)) {
      let w = 0, ok = 0;
      res.forEach((x) => {
        const m = [1, 1.5, 2][(x.q.lvl || 2) - 1];
        w += m;
        if (x.ok) ok += m;
      });
      sk[k] = w ? ok / w : 0;
    }
    const mean = (ks: string[]) => (ks.length ? ks.reduce((a, k) => a + sk[k], 0) / ks.length : null);
    const ia = mean(['vocab', 'grammar', 'reading', 'listening'].filter((k) => sk[k] != null));
    const sa = mean(['rw', 'math'].filter((k) => sk[k] != null));
    const acc = ia ?? sa ?? 0;
    const weak = Object.keys(sk).sort((a, b) => sk[a] - sk[b]);
    const s = store.getState();
    const d = { date: new Date().toISOString().slice(0, 10), skills: sk, cefr: cefr(acc), band: ia != null ? toBand(ia) : null, sat: sa != null ? toSat(sa) : null, weak };
    s.setDiag(d);
    s.unlock('diag');
    const fs = s.finishSession(Object.values(per.current).flat(), { title: 'Диагностика' });
    s.addXP(40, 15);
    confetti(70);
    setSummary({ sk, weak, cefr: d.cefr, band: d.band, sat: d.sat, errs: fs.errs.length });
    setIdx(stages.length);
  };

  if (idx === -1)
    return (
      <div className="card">
        <Mood state="board" text={t('Диагностика: {list}. Вопросы подстраиваются под тебя. Не гадай — «не знаю» тоже ответ (кнопка «Пропустить»).', { list: stages.map((s) => s.title).join(' → ') })} />
        <p className="center"><button className="btn" data-testid="diag-start" onClick={() => setIdx(0)}>{t('Начать')}</button></p>
      </div>
    );

  if (idx >= stages.length && summary) {
    const st = store.getState();
    return (
      <div className="card" data-testid="diag-result">
        <Mood state={summary.cefr >= 'B2' ? 'happy' : 'cheer'} text={<>{t('Готово! Твой уровень')} ≈ <b>{summary.cefr}</b>{summary.band != null && <>, IELTS ≈ <b>{summary.band}</b></>}{summary.sat != null && <>, SAT ≈ <b>{summary.sat}</b></>}.</>} />
        <h3>{t('Карта сильных и слабых сторон')}</h3>
        {Object.entries(summary.sk).map(([k, v]) => (
          <div key={k} className="row" style={{ margin: '.5rem 0' }}>
            <b style={{ width: 90 }}>{k}</b><Bar value={v} style={{ flex: 1 }} label={k} /><span>{Math.round(v * 100)}%</span>
          </div>
        ))}
        <p><b>{t('Слабее всего')}:</b> {summary.weak.slice(0, 2).join(', ')}. {t('Начнём с них — план уже перестроен.')}</p>
        <p>{t('Нужно ≈ {n} мин в день ({d} дней до экзамена).', { n: minutesPerDay(st), d: daysLeft(st) })}</p>
        <div className="row">
          {summary.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор ошибок')} ({summary.errs})</Link>}
          <Link className="btn" to="/path">{t('К карте пути')}</Link>
        </div>
      </div>
    );
  }
  const stage = stages[idx];
  return <StageQuiz key={stage.id} st={stage} D={D} words={words} onDone={(r) => done(stage, r)} />;
}
