import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { WriteFlow, textItems, type WriteResult } from '../writing/flows';
import { SpeakingFlow } from '../speaking/flows';
import { Banner } from './banner';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { toBand } from '@/lib/plan';
import { today } from '@/lib/util';
import { t } from '@/i18n';
import type { QResult, QuizResult, ReviewText } from '@/types';

const R_IDS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10'];
const L_IDS = ['l1q1', 'l1q2', 'l1q3', 'l1q4', 'l2q1', 'l2q2', 'l2q3', 'l2q4'];
type Stage = 'intro' | 'reading' | 'listening' | 'w1' | 'w2' | 'speaking' | 'saving';

export default function IeltsExam() {
  const { mode = 'full' } = useParams();
  const D = useData((s) => s.D);
  if (!D) return null;
  if (!['full', 'reading', 'listening'].includes(mode)) return <Navigate to="/exam" replace />;
  return <Run mode={mode} />;
}

function Run({ mode }: { mode: string }) {
  const D = useData((s) => s.D)!;
  const nav = useNavigate();
  const full = mode === 'full';
  const order = useMemo<Stage[]>(() => (full ? ['reading', 'listening', 'w1', 'w2', 'speaking'] : [mode as Stage]), [full, mode]);
  const [stage, setStage] = useState<Stage>('intro');
  const t0 = useRef(Date.now());
  const all = useRef<QResult[]>([]);
  const parts = useRef<Record<string, number>>({});
  const extra = useRef<ReviewText[]>([]);
  const writes = useRef<WriteResult[]>([]);
  const idx = useRef(-1);

  const advance = () => {
    idx.current++;
    if (idx.current >= order.length) return finish();
    setStage(order[idx.current]);
  };
  const finish = () => {
    setStage('saving');
    const bs = Object.values(parts.current);
    const band = Math.round((bs.reduce((a, b) => a + b, 0) / Math.max(1, bs.length)) * 2) / 2;
    const s = useProgress.getState();
    s.finishSession(all.current, { title: 'IELTS Mock', extra: extra.current });
    const id = s.addExam({ type: 'ielts', date: today(), band, parts: parts.current, mode, mins: Math.round((Date.now() - t0.current) / 60000) });
    s.addXP(80, Math.max(15, Math.round((Date.now() - t0.current) / 60000)));
    nav('/report/' + id, { replace: true });
  };
  const H = (sec: string) => <Banner title="IELTS Mock" sec={sec} />;
  const qs = (ids: string[]) => ids.map((i) => D.qById[i]).filter(Boolean);
  const quizDone = (key: string) => (r: QuizResult) => { all.current.push(...r.results); parts.current[key] = toBand(r.ok / Math.max(1, r.total)); advance(); };
  const wr = (id: 't1' | 't2') => D.prompts.writing.find((x) => x.id === id)!;

  if (stage === 'intro')
    return <div className="card"><Mood state="board" text={t('Поехали. Таймеры идут сами, подсказок не будет. Удачи!')} /><p className="center"><button className="btn" data-testid="exam-go" onClick={advance}>{t('Начать экзамен')}</button></p></div>;
  if (stage === 'reading')
    return <Quiz key="r" title="Reading" questions={qs(R_IDS)} timer={20 * 60} feedback={false} header={H('Reading')} onDone={quizDone('reading')} />;
  if (stage === 'listening')
    return <Quiz key="l" title="Listening" questions={qs(L_IDS)} timer={12 * 60} once feedback={false} header={H(t('Listening — аудио звучит один раз'))} onDone={quizDone('listening')} />;
  if (stage === 'w1' || stage === 'w2')
    return <WriteFlow key={stage} p={wr(stage === 'w1' ? 't1' : 't2')} header={H('Writing ' + wr(stage === 'w1' ? 't1' : 't2').kind)} onDone={(r) => { writes.current.push(r); extra.current.push(...textItems(r.res, 'writing', wr(stage === 'w1' ? 't1' : 't2').kind));
      if (stage === 'w2') { const o = Math.round((writes.current[0].res.overall / 3 + (writes.current[1].res.overall * 2) / 3) * 2) / 2; parts.current.writing = o; useProgress.getState().addWriting({ id: 't1+t2', title: 'Mock', date: today(), overall: o }); }
      advance(); }} />;
  if (stage === 'speaking')
    return <SpeakingFlow key="sp" header={H('Speaking')} onDone={(r) => { parts.current.speaking = r.res.overall; extra.current.push(...textItems(r.res, 'speaking', 'Speaking')); advance(); }} />;
  return <div className="card"><div className="skel" /></div>;
}
