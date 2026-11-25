import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { useProgress } from '@/store/progress';
import { dueCards } from '@/lib/srs';
import { t } from '@/i18n';

export default function JournalTrain() {
  const P = useProgress;
  const [res, setRes] = useState<{ ok: number; total: number; errs: number } | null>(null);
  const list = useMemo(() => {
    const s = P.getState();
    const due = new Set(dueCards(s.cards, 'error').map((c) => c.id.slice(2)));
    let l = s.errors.filter((e) => due.has(e.qid));
    if (l.length < 3) l = [...l, ...s.errors.filter((e) => !l.includes(e)).sort((a, b) => b.count - a.count)];
    return l.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!list.length)
    return <div className="card"><Mood state="celebrate" text={t('Журнал пуст — ошибок нет!')} /><Link className="btn" to="/home">{t('Ок')}</Link></div>;
  if (res)
    return (
      <div className="card" data-testid="train-done"><Mood state={res.ok === res.total ? 'celebrate' : 'cheer'} text={t('Готово: {ok}/{total}', { ok: res.ok, total: res.total })} />
        <div className="row">{res.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор')}</Link>}<Link className="btn" to="/home">{t('Ок')}</Link></div></div>
    );
  return (
    <Quiz title={t('Работа над ошибками')} questions={list.map((e) => e.q)} feedback onDone={(r) => {
      const s = P.getState();
      const fs = s.finishSession(r.results, { title: t('Журнал') });
      // выученная с первого раза ошибка (count<=1) уходит из журнала; повторяющиеся остаются
      if (fs.ok === fs.total) list.forEach((e) => { if (e.count <= 1) s.removeError(e.id); });
      s.missionDone('errors');
      s.addXP(10 + fs.ok * 3, 5);
      setRes({ ok: fs.ok, total: fs.total, errs: fs.errs.length });
    }} />
  );
}
