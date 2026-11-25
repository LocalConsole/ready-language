import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { GradeView, WriteFlow, textItems, type WriteResult } from './flows';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { today } from '@/lib/util';
import { t } from '@/i18n';

export default function WriteTask() {
  const { id } = useParams();
  const D = useData((s) => s.D);
  const p = D?.prompts.writing.find((x) => x.id === id);
  const [r, setR] = useState<WriteResult | null>(null);
  if (!D) return null;
  if (!p) return <Navigate to="/writing" replace />;
  if (!r)
    return <WriteFlow p={p} onDone={(x) => {
      const s = useProgress.getState();
      s.addWriting({ id: p.id, title: p.title, date: today(), overall: x.res.overall, words: x.words, local: !!x.res.local });
      s.unlock('writer');
      s.addXP(25, p.min);
      const extra = textItems(x.res, 'writing', 'Writing');
      s.setReview({ title: 'Writing: ' + p.title, items: [], extra });
      setR(x);
    }} />;
  const extra = textItems(r.res, 'writing', 'Writing');
  return (
    <div className="card" data-testid="write-result">
      <Mood state={r.res.overall >= 6.5 ? 'celebrate' : 'cheer'} text={t('Работа проверена.')} />
      <GradeView res={r.res} exam={p.exam} />
      <div className="row" style={{ marginTop: '1rem' }}>{extra.length > 0 && <Link className="btn alt" to="/review">{t('Разбор по строкам')}</Link>}<Link className="btn" to="/writing">{t('Готово')}</Link></div>
    </div>
  );
}
