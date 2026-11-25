import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mood, Say } from '@/components/Mascot';
import { Bar } from '@/components/ui';
import { gradeWriting } from '@/lib/aiTasks';
import { localWriting } from '@/lib/localGrade';
import { fmtTime, countWords } from '@/lib/util';
import { toast } from '@/store/ui';
import { t } from '@/i18n';
import type { GradeResult, ReviewText, WritingPrompt } from '@/types';

export const textItems = (res: GradeResult, skill: string, title: string): ReviewText[] =>
  (res.errors || []).map((e) => ({ kind: 'text', skill, title, original: e.original, fix: e.fix, why: e.why }));

export function GradeView({ res, exam }: { res: GradeResult; exam?: string }) {
  const crit = res.criteria || [];
  const max = exam === 'sat' ? 4 : 9;
  return (
    <div data-testid="grade-view">
      {res.local
        ? <div className="expl" data-testid="grade-local">⚠️ {t('Оценка без ИИ — приблизительная (длина, связки, лексика). Подключи ключ в Настройках для проверки по официальным критериям.')}</div>
        : <div className="expl small" data-testid="grade-ai">✅ {t('Проверено ИИ по официальным критериям. Это ориентир, а не официальный балл.')}</div>}
      <h2 style={{ marginTop: '.8rem' }}>{exam === 'sat' ? t('Оценка') : 'Band'}: <span style={{ color: 'var(--brand)' }} data-testid="overall">{res.overall}</span></h2>
      {crit.map((c) => (
        <div key={c.name} style={{ margin: '.6rem 0' }}>
          <div className="row"><b className="sp">{c.name}</b><b>{c.band}</b></div>
          <Bar value={(c.band / max) * 100} /><div className="small mute">{c.comment}</div>
        </div>
      ))}
      {(res.errors || []).length > 0 && (
        <><h3>{t('Ошибки и исправления')}</h3>
          <table className="tbl"><tbody>{res.errors.map((e, i) => <tr key={i}><td>❌ {e.original}</td><td>✅ <b>{e.fix}</b><div className="small mute">{e.why}</div></td></tr>)}</tbody></table></>
      )}
      {res.improved && <><h3>{t('Улучшенный вариант')}</h3><div className="passage" style={{ maxHeight: 'none' }}>{res.improved}</div></>}
    </div>
  );
}

export interface WriteResult { text: string; res: GradeResult; words: number }

/** Задание Writing: таймер, счётчик слов, отправка → оценка ИИ или локальная. */
export function WriteFlow({ p, header, min, onDone }: { p: WritingPrompt; header?: ReactNode; min?: number; onDone: (r: WriteResult) => void }) {
  const [text, setText] = useState('');
  const [left, setLeft] = useState((min ?? p.min) * 60);
  const [busy, setBusy] = useState(false);
  const textRef = useRef(text);
  textRef.current = text;
  const sent = useRef(false);
  const words = countWords(text);

  const send = async (auto: boolean) => {
    if (sent.current) return;
    const tx = textRef.current.trim();
    if (!tx && !auto) return toast(t('Сначала напиши текст'));
    sent.current = true;
    setBusy(true);
    let res = tx ? await gradeWriting(p.prompt, tx, p.exam) : null;
    if (!res || typeof res.overall !== 'number') res = localWriting(tx, p.minWords);
    res.criteria = res.criteria || [];
    onDone({ text: tx, res, words: countWords(tx) });
  };
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left <= 0) send(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (busy)
    return <div className="card" data-testid="grading"><Mood state="think" text={t('Проверяю по критериям… Это займёт несколько секунд.')} /><div className="skel" /><div className="skel" style={{ width: '80%' }} /><div className="skel" style={{ width: '60%' }} /></div>;
  return (
    <>
      {header}
      <div className="card">
        <div className="row"><span className={`pill ${p.exam}`}>{p.kind}</span><b className="sp">{p.title}</b><span className={`timer ${left < 300 ? 'low' : ''}`} role="timer">{fmtTime(Math.max(0, left))}</span></div>
        <div className="passage" style={{ maxHeight: 'none', marginTop: '.8rem' }}>{p.prompt}</div>
        <textarea data-testid="essay" placeholder={t('Пиши здесь…')} spellCheck={false} aria-label={t('Текст')} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          <span className="chip" data-testid="wc" style={{ background: words >= p.minWords ? '#d8f1e0' : undefined }}>{words} {t('слов')}</span>
          <span className="small mute">{t('минимум')} {p.minWords}</span><span className="sp" />
          <button className="btn" data-testid="essay-send" onClick={() => send(false)}>{t('Отправить на проверку')}</button>
        </div>
      </div>
    </>
  );
}

export { Say };
