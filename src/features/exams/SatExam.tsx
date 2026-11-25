import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { Calculator } from '@/components/Calculator';
import { Banner } from './banner';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { shuffle, today } from '@/lib/util';
import { t } from '@/i18n';
import type { QResult, Question, QuizResult } from '@/types';

type Sk = 'rw' | 'math';
const NAMES: Record<Sk, [string, number]> = { rw: ['Reading & Writing', 10 * 60], math: ['Math', 12 * 60] };

export default function SatExam() {
  const { mode = 'full' } = useParams();
  const D = useData((s) => s.D);
  if (!D) return null;
  if (!['full', 'rw', 'math'].includes(mode)) return <Navigate to="/exam" replace />;
  return <Run mode={mode} />;
}

/** Модуль 2 сложнее, если в модуле 1 ≥66%. Шкала: 200–800 на секцию, взвешено по сложности. */
function Run({ mode }: { mode: string }) {
  const D = useData((s) => s.D)!;
  const nav = useNavigate();
  const full = mode === 'full';
  const secs = useMemo<Sk[]>(() => (full ? ['rw', 'math'] : [mode as Sk]), [full, mode]);
  const pools = useMemo(() => Object.fromEntries(secs.map((sk) => {
    const pool = shuffle(D.questions.filter((q) => q.skill === sk));
    const half = Math.ceil(pool.length / 2);
    return [sk, { m1: pool.slice(0, half), rest: pool.slice(half) }];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })) as Record<Sk, { m1: Question[]; rest: Question[] }>, [secs.join()]);
  const [step, setStep] = useState(-1); // -1 intro; 2*k = модуль 1 секции k; 2*k+1 = модуль 2
  const [m2, setM2] = useState<Question[]>([]);
  const t0 = useRef(Date.now());
  const all = useRef<QResult[]>([]);
  const parts = useRef<Record<string, number>>({});
  const acc1 = useRef(0);
  const secRes = useRef<QResult[]>([]);

  const sk = secs[Math.floor(step / 2)];
  const H = (s: string) => <Banner title="Digital SAT Mock" sec={s} />;

  const score = (res: QResult[], a1: number) => {
    let w = 0, ok = 0;
    res.forEach((r) => { const x = [1, 1.5, 2][r.q.lvl - 1] || 1; w += x; if (r.ok) ok += x; });
    const bonus = a1 >= 0.66 ? 1 : 0.92;
    return Math.round((200 + 600 * Math.min(1, (ok / Math.max(w, 1)) * bonus)) / 10) * 10;
  };
  const finish = () => {
    const s = useProgress.getState();
    const sum = Object.values(parts.current).reduce((a, b) => a + b, 0) * (full ? 1 : 2);
    s.finishSession(all.current, { title: 'SAT Mock' });
    const id = s.addExam({ type: 'sat', date: today(), sat: full ? sum : Math.round(sum / 10) * 10, parts: parts.current, mode, mins: Math.round((Date.now() - t0.current) / 60000) });
    s.addXP(80, Math.max(15, Math.round((Date.now() - t0.current) / 60000)));
    nav('/report/' + id, { replace: true });
  };
  const onM1 = (r: QuizResult) => {
    all.current.push(...r.results);
    secRes.current = [...r.results];
    acc1.current = r.ok / Math.max(1, r.total);
    const { rest } = pools[sk];
    setM2([...rest].sort((a, b) => (acc1.current >= 0.66 ? b.lvl - a.lvl : a.lvl - b.lvl)));
    setStep(step + 1);
  };
  const onM2 = (r: QuizResult) => {
    all.current.push(...r.results);
    parts.current[sk] = score([...secRes.current, ...r.results], acc1.current);
    if (step + 1 >= secs.length * 2) finish(); else setStep(step + 1);
  };

  if (step < 0)
    return <div className="card"><Mood state="board" text={t('Модули адаптивные: результат первого определяет сложность второго. Калькулятор — под рукой.')} /><p className="center"><button className="btn" data-testid="exam-go" onClick={() => setStep(0)}>{t('Начать')}</button></p></div>;
  const [label, secsLimit] = NAMES[sk];
  const first = step % 2 === 0;
  const title = `${label} · ${t('Модуль')} ${first ? 1 : 2}${first ? '' : ' (' + (acc1.current >= 0.66 ? t('сложнее') : t('легче')) + ')'}`;
  return (
    <>
      <Quiz key={step} title={title} questions={first ? pools[sk].m1 : m2} timer={secsLimit} feedback={false} header={H(title)} onDone={first ? onM1 : onM2} />
      {sk === 'math' && <Calculator />}
    </>
  );
}
