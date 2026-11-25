import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { shuffle } from '@/lib/util';
import { t } from '@/i18n';
import type { Skill } from '@/types';

const MAP: Record<string, Skill> = { vocab: 'grammar', grammar: 'grammar', reading: 'reading', listening: 'listening', rw: 'rw', math: 'math' };

export default function QuickTest() {
  const all = useData((s) => s.D?.questions) || [];
  const weak = useProgress((s) => s.diag?.weak?.[0] || 'grammar');
  const P = useProgress;
  const [res, setRes] = useState<{ ok: number; total: number; errs: number } | null>(null);
  const qs = useMemo(() => {
    const free = all.filter((q) => !q.passage);
    const by = shuffle(free.filter((q) => q.skill === (MAP[weak] || 'grammar'))).slice(0, 5);
    return by.length ? by : shuffle(free).slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length]);
  if (res)
    return (
      <div className="card" data-testid="quick-done"><Mood state={res.ok >= 4 ? 'celebrate' : 'cheer'} text={`${res.ok}/${res.total}`} />
        <div className="row">{res.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор')}</Link>}<Link className="btn" to="/home">{t('Ок')}</Link></div></div>
    );
  return (
    <Quiz title={t('Быстрый тест')} questions={qs} feedback onDone={(r) => {
      const s = P.getState();
      const fs = s.finishSession(r.results, { title: t('Быстрый тест') });
      s.missionDone('errors');
      s.addXP(10 + fs.ok * 3, 5);
      setRes({ ok: fs.ok, total: fs.total, errs: fs.errs.length });
    }} />
  );
}
