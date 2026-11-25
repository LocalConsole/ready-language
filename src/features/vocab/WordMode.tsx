import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood } from '@/components/Mascot';
import { useProgress } from '@/store/progress';
import { useAllWords, useBeginner } from '@/lib/hooks';
import { makeVQ, type VQMode } from '@/lib/vocabQuestions';
import { pick, shuffle } from '@/lib/util';
import { t } from '@/i18n';

export default function WordMode() {
  const { mode } = useParams();
  return <Mode key={mode} mode={mode || 'choice'} />;
}

function Mode({ mode }: { mode: string }) {
  const words = useAllWords();
  const beginner = useBeginner();
  const P = useProgress;
  const [res, setRes] = useState<{ ok: number; total: number; errs: number } | null>(null);
  const qs = useMemo(() => {
    const pool = shuffle(words.filter((w) => !w.custom || w.def)).slice(0, 8);
    const m = (): VQMode => (mode === 'choice' ? (beginner ? pick<VQMode>(['tr', 'rev']) : pick<VQMode>(['tr', 'def', 'cloze'])) : (mode as VQMode));
    pool.forEach((w) => P.getState().srsAdd(w.id));
    return pool.map((w) => makeVQ(w, m(), words));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (res)
    return (
      <div className="card" data-testid="mode-done">
        <Mood state={res.ok >= 6 ? 'celebrate' : 'cheer'} text={t('Результат: {ok}/{total}', { ok: res.ok, total: res.total })} />
        <div className="row">{res.errs > 0 && <Link className="btn alt" to="/review">{t('Разбор ошибок')}</Link>}<Link className="btn" to="/vocab">{t('Назад')}</Link></div>
      </div>
    );
  return (
    <Quiz title={t('Слова')} questions={qs} feedback onDone={(r) => {
      const s = P.getState();
      const fs = s.finishSession(r.results, { title: t('Слова') });
      s.addXP(5 + fs.ok * 3, 6);
      s.missionDone('words');
      setRes({ ok: fs.ok, total: fs.total, errs: fs.errs.length });
    }} />
  );
}
