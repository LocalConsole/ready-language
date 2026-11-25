import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { GradeView, textItems } from '../writing/flows';
import { SpeakingFlow, type Answer } from './flows';
import { useProgress } from '@/store/progress';
import { today } from '@/lib/util';
import { t } from '@/i18n';
import type { GradeResult } from '@/types';

export default function Speaking() {
  const [go, setGo] = useState(false);
  const [r, setR] = useState<{ res: GradeResult; answers: Answer[] } | null>(null);
  if (r)
    return (
      <div className="card" data-testid="speaking-result">
        <Mood state={r.res.overall >= 6.5 ? 'celebrate' : 'cheer'} text={t('Speaking завершён.')} />
        <GradeView res={r.res} />
        <h3>{t('Твои записи')}</h3>
        {r.answers.map((a, i) => (
          <div className="small" key={i} style={{ borderTop: i ? '1px solid var(--line)' : 0, padding: '.4rem 0' }}>
            <b>{a.label}:</b> {a.prompt}{a.url && <audio controls src={a.url} style={{ width: '100%' }} />}<br /><i>{a.transcript || '—'}</i>
          </div>
        ))}
        <div className="row"><Link className="btn alt" to="/review">{t('Разбор')}</Link><Link className="btn" to="/home">{t('Готово')}</Link></div>
      </div>
    );
  if (!go)
    return (
      <>
        <PageHead icon="🎤" title={t('Speaking с Мишей')} sub={t('Part 1, 2, 3 как на экзамене: Миша спрашивает, ты отвечаешь голосом.')} acc="speaking" />
        <div className="card"><Mood state="hello" text={t('Три части, как на экзамене. Part 2: минута подготовки и две минуты речи. Микрофон попрошу в браузере.')} />
          <p className="center"><button className="btn" data-testid="speak-start" onClick={() => setGo(true)}>{t('Начать')}</button></p></div>
      </>
    );
  return <SpeakingFlow onDone={(x) => {
    const s = useProgress.getState();
    s.setReview({ title: 'Speaking', items: [], extra: textItems(x.res, 'speaking', 'Speaking') });
    s.addSpeaking({ date: today(), overall: x.res.overall, local: !!x.res.local });
    s.unlock('speaker');
    s.addXP(30, 15);
    setR(x);
  }} />;
}
