import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { QResult, QuizResult, Word } from '@/types';
import { Quiz } from '@/components/Quiz';
import { Mood, Say } from '@/components/Mascot';
import { Bar, Html } from '@/components/ui';
import { WordCards } from '@/features/vocab/WordCards';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { useAllWords, useBeginner } from '@/lib/hooks';
import { makeVQ } from '@/lib/vocabQuestions';
import { confetti, playSound } from '@/lib/fx';
import { shuffle } from '@/lib/util';
import { t } from '@/i18n';

type Step = 'explain' | 'example' | 'vocab' | 'task' | 'practice' | 'test';

export default function LessonPage() {
  const { id } = useParams();
  const D = useData((s) => s.D);
  const L = id ? D.lessonById[id] : undefined;
  if (!L) return <Navigate to="/path" replace />;
  return <LessonFlow key={L.id} />;
}

function LessonFlow() {
  const { id } = useParams();
  const D = useData((s) => s.D);
  const L = D.lessonById[id!];
  const words = useAllWords();
  const beginner = useBeginner();
  const P = useProgress;
  const pool = useMemo(() => D.questions.filter((q) => q.topic === L.topic), [D, L]);
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ['explain', 'example'];
    if (L.topic === 'words') s.push('vocab');
    else if (L.task && (L.task.type === 'writing' || L.task.type === 'speaking')) s.push('task');
    else {
      s.push('practice');
      if (pool.length >= 4) s.push('test');
    }
    return s;
  }, [L, pool]);

  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'cards' | 'quiz'>('cards');
  const [fin, setFin] = useState<{ score: number; gained: number; errs: number } | null>(null);
  const all = useRef<QResult[]>([]);
  const finished = useRef(false);
  const vocabSet = useRef<{ ws: Word[]; qs: ReturnType<typeof makeVQ>[] } | null>(null);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const s = P.getState();
    const fs = s.finishSession(all.current, { title: t('Урок: {title}', { title: L.title }) });
    const score = all.current.length ? Math.round((fs.ok / all.current.length) * 100) : 100;
    const gained = 20 + fs.ok * 5;
    s.setLesson(L.id, score);
    s.addXP(gained, L.min);
    s.missionDone('lesson');
    confetti(score >= 60 ? 120 : 30);
    playSound(score >= 60 ? 'win' : 'bad');
    setFin({ score, gained, errs: fs.errs.length });
  };
  const advance = () => (i + 1 >= steps.length ? finish() : (setI(i + 1), setPhase('cards')));
  const quizDone = (r: QuizResult) => {
    all.current.push(...r.results);
    advance();
  };

  const hdr = (
    <div className="row">
      <Link className="btn alt sm" to="/path">← {t('Путь')}</Link>
      <h2 className="sp" style={{ margin: 0 }}>{L.icon} {t(L.title)}</h2>
    </div>
  );
  if (fin) {
    const hw = L.task ? t('Выполни задание в разделе «{x}».', { x: L.task.type === 'writing' ? 'Writing' : 'Speaking' }) : L.topic === 'words' ? t('Повтори 5 новых слов завтра — они уже в SRS.') : t('Завтра повтори ошибки из журнала — они уже там.');
    return (
      <>
        {hdr}
        <div className="card" data-testid="lesson-done">
          <Mood state={fin.score >= 60 ? 'celebrate' : 'cheer'} text={<>{t('Урок пройден! Результат')}: <b>{fin.score}%</b> (+{fin.gained} XP).</>} />
          <div className="expl">📝 <b>{t('Домашка')}:</b> {hw}</div>
          <div className="row" style={{ marginTop: '1rem' }}>
            {fin.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор ошибок')} ({fin.errs})</Link>}
            <Link className="btn" to="/path">{t('Дальше по карте')}</Link>
          </div>
        </div>
      </>
    );
  }

  const step = steps[i];
  const bar = <Bar value={i / steps.length} style={{ margin: '.6rem 0 1rem' }} label={t('Прогресс урока')} />;
  if (step === 'explain')
    return (
      <>
        {hdr}{bar}
        <div className="card top" data-acc={L.module}>
          <Say state="board"><b>{t('Запомни главное:')}</b></Say>
          <ol className="numbered">{L.explain.map((x, k) => <li key={k}><Html html={x} /></li>)}</ol>
          {L.tip && <div className="expl">💡 {L.tip}</div>}
          <p className="center"><button className="btn" data-testid="lesson-next" onClick={advance}>{t('Дальше')}</button></p>
        </div>
      </>
    );
  if (step === 'example')
    return (
      <>
        {hdr}{bar}
        <div className="card top" data-acc={L.module}>
          <Say state="explain"><b>{t('Пример')}</b><br /><Html html={L.example} /></Say>
          <p className="center"><button className="btn" data-testid="lesson-next" onClick={advance}>{t('К практике')}</button></p>
        </div>
      </>
    );
  if (step === 'task')
    return (
      <>
        {hdr}{bar}
        <div className="card">
          <Mood state="cheer" text={t('Практика прямо на сайте — это и есть домашка.')} />
          <p className="center">
            <Link className="btn" to={L.task!.type === 'writing' ? '/write/' + L.task!.id : '/speaking'}>{t('Открыть задание')}</Link>{' '}
            <button className="btn alt" data-testid="lesson-next" onClick={advance}>{t('Я сделаю позже')} →</button>
          </p>
        </div>
      </>
    );
  if (step === 'vocab') {
    if (!vocabSet.current) {
      const s = P.getState();
      const ws = shuffle(words.filter((w) => !s.cards[w.id] && !w.custom)).slice(0, 5);
      ws.forEach((w) => s.srsAdd(w.id));
      vocabSet.current = { ws, qs: ws.flatMap((w) => [makeVQ(w, 'tr', words), makeVQ(w, beginner ? 'rev' : w.def ? 'def' : 'tr', words)]) };
    }
    const v = vocabSet.current;
    if (!v.ws.length) return <><div className="card"><Mood state="celebrate" text={t('Ты уже начал учить все слова из базы!')} /><button className="btn" onClick={advance}>{t('Дальше')}</button></div></>;
    if (phase === 'cards') return <>{hdr}<WordCards words={v.ws} onDone={() => setPhase('quiz')} /></>;
    return <Quiz key="v" title={t(L.title)} questions={v.qs} feedback header={hdr} onDone={(r) => { P.getState().missionDone('words'); quizDone(r); }} />;
  }
  const half = pool.length >= 4 ? Math.ceil(pool.length / 2) : pool.length;
  const qs = step === 'practice' ? pool.slice(0, half) : pool.slice(half);
  return <Quiz key={step} title={step === 'practice' ? t('Практика') : t('Мини-тест')} questions={qs} feedback={step === 'practice'} header={hdr} onDone={quizDone} />;
}
