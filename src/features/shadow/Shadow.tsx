import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { useData } from '@/data';
import { db } from '@/lib/db';
import { useProgress } from '@/store/progress';
import { useWordIndex } from '@/lib/hooks';
import { lemma } from '@/lib/words';
import { speak } from '@/lib/fx';
import { toast } from '@/store/ui';
import { t } from '@/i18n';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/).filter(Boolean);

/** Совпавшие слова эталона a с ответом b (LCS). */
export function lcsHits(a: string[], b: string[]): Set<number> {
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Set<number>();
  let i = a.length, j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { hit.add(i - 1); i--; j--; } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
  }
  return hit;
}

export default function Shadow() {
  const { id, mode } = useParams();
  const D = useData((s) => s.D);
  const user = useLiveQuery(() => db.texts.toArray(), [], []) || [];
  const texts = [...(D?.listeningTexts || []), ...(D?.readingTexts || []), ...user];
  if (!D) return null;
  if (!id)
    return (
      <>
        <PageHead icon="🎧" title={t('Shadowing и диктанты')} sub={t('Слушай, повторяй вслух, пиши по слуху.')} acc="listening" />
        <div className="card"><Mood state="hello" text={t('Слушай, повторяй, пиши по слуху. Выбери текст.')} /></div>
        {texts.map((x) => (
          <div className="card row" key={x.id} data-acc="listening" style={{ borderLeft: '8px solid var(--acc)' }}>
            <span className="sp"><b>{x.title}</b></span>
            <Link className="btn alt sm" to={`/shadow/${x.id}/shadow`}>Shadowing</Link>
            <Link className="btn sm" data-testid={'dict-' + x.id} to={`/shadow/${x.id}/dict`}>{t('Диктант')}</Link>
          </div>
        ))}
      </>
    );
  const T = texts.find((x) => x.id === id);
  if (!T) return user.length || !id ? <Navigate to="/shadow" replace /> : null;
  return <Session key={id + mode} title={T.title} text={T.text} mode={mode === 'dict' ? 'dict' : 'shadow'} />;
}

function Session({ title, text, mode }: { title: string; text: string; mode: 'dict' | 'shadow' }) {
  const idx = useWordIndex();
  const ss = useMemo(() => text.replace(/\n+/g, ' ').replace(/^[A-Za-z ]+:\s*/gm, '').split(/(?<=[.!?])\s+/).filter((x) => x.length > 6).slice(0, 12), [text]);
  const [k, setK] = useState(0);
  const [score, setScore] = useState(0);
  const [rate, setRate] = useState(0.9);
  const [ans, setAns] = useState('');
  const [fb, setFb] = useState<{ html: { w: string; miss: boolean }[]; perfect: boolean } | null>(null);
  const [rec, setRec] = useState<{ run: boolean; url: string | null }>({ run: false, url: null });
  const mr = useRef<MediaRecorder | null>(null);
  const done = useRef(false);
  useEffect(() => { if (ss[k]) speak(ss[k], { rate: 0.9 }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [k]);

  if (k >= ss.length) {
    if (!done.current) { done.current = true; setTimeout(() => useProgress.getState().addXP(10 + score * 2, 8), 0); }
    return <div className="card" data-testid="shadow-done"><Mood state="celebrate" text={mode === 'dict' ? t('Диктант: {a}/{b} предложений без ошибок', { a: score, b: ss.length }) : t('Shadowing завершён!')} /><Link className="btn" to="/shadow">{t('Ещё')}</Link></div>;
  }
  const s = ss[k];
  const nextS = () => { setK(k + 1); setAns(''); setFb(null); setRec({ run: false, url: null }); };
  const check = () => {
    const a = s.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/).filter(Boolean);
    const b = norm(ans);
    const hit = lcsHits(a, b);
    const perfect = hit.size === a.length && b.length === a.length;
    if (perfect) setScore((x) => x + 1);
    a.forEach((w, i) => { if (!hit.has(i)) { const lw = lemma(idx, w); if (lw) useProgress.getState().srsAdd(lw.id); } });
    setFb({ html: a.map((w, i) => ({ w, miss: !hit.has(i) })), perfect });
  };
  const toggleRec = async () => {
    if (rec.run) { mr.current?.stop(); return; }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(st); const ch: Blob[] = [];
      r.ondataavailable = (e) => ch.push(e.data);
      r.onstop = () => { st.getTracks().forEach((x) => x.stop()); setRec({ run: false, url: URL.createObjectURL(new Blob(ch)) }); };
      r.start(); mr.current = r; setRec({ run: true, url: null });
    } catch { toast(t('Нет доступа к микрофону')); }
  };
  return (
    <>
      <div className="row"><Link className="btn alt sm" to="/shadow">←</Link><b className="sp">{title} · {k + 1}/{ss.length}</b>
        <label className="small">{t('скорость')} <input type="range" aria-label={t('скорость')} min={0.6} max={1.2} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} style={{ width: 80 }} /></label></div>
      <div className="card">
        <button className="btn" data-testid="play" onClick={() => speak(s, { rate })}>🔊 {t('Слушать')}</button>
        {mode === 'dict' ? (
          <>
            <textarea data-testid="dictation" aria-label={t('Напиши, что услышал…')} style={{ minHeight: 90, marginTop: '.6rem' }} placeholder={t('Напиши, что услышал…')} value={ans} onChange={(e) => setAns(e.target.value)} disabled={!!fb} />
            {!fb && <div className="row" style={{ marginTop: '.5rem' }}><button className="btn" data-testid="check" onClick={check}>{t('Проверить')}</button></div>}
            {fb && (
              <>
                <div className="expl" data-testid="dict-fb">{fb.perfect ? '✅ ' + t('Идеально!') : t('Эталон (пропущенное выделено):')}<br />{fb.html.map((x, i) => <span key={i}>{x.miss ? <mark>{x.w}</mark> : x.w} </span>)}</div>
                <p className="center"><button className="btn" data-testid="dict-next" onClick={nextS}>{t('Далее')}</button></p>
              </>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.15rem', margin: '1rem 0' }}>{s}</p>
            <div className="row"><button className="btn alt" onClick={toggleRec}>{rec.run ? '⏹ ' + t('Стоп') : '🎙️ ' + t('Повторить (запись)')}</button>{rec.url && <audio controls src={rec.url} />}</div>
            <p className="center"><button className="btn" data-testid="shadow-next" onClick={() => { setScore((x) => x + 1); nextS(); }}>{t('Далее')}</button></p>
          </>
        )}
      </div>
    </>
  );
}
