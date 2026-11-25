import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Say } from '@/components/Mascot';
import { useData } from '@/data';
import { gradeSpeaking } from '@/lib/aiTasks';
import { localSpeaking } from '@/lib/localGrade';
import { speak, stopSpeak } from '@/lib/fx';
import { fmtTime, pick, shuffle } from '@/lib/util';
import { t } from '@/i18n';
import type { GradeResult } from '@/types';

type SRCtor = new () => {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null; start(): void; stop(): void;
};
const SR: SRCtor | undefined = typeof window !== 'undefined' ? (window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition : undefined;

export interface Answer { label: string; prompt: string; transcript: string; secs: number; url: string | null }

/** Один ответ: запись (MediaRecorder + SpeechRecognition) или ввод текстом, если микрофона нет. */
export function RecordAnswer({ label, prompt, points, max, autoAsk, header, onDone }: { label: string; prompt: string; points?: string[]; max?: number; autoAsk?: boolean; header?: ReactNode; onDone: (a: Answer) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(SR ? '' : t('Распознавание речи недоступно в этом браузере — печатай ответ.'));
  const [url, setUrl] = useState<string | null>(null);
  const r = useRef<{ rec?: MediaRecorder; sr?: InstanceType<SRCtor>; stream?: MediaStream; t0: number; final: string; chunks: Blob[]; tm?: number }>({ t0: 0, final: '', chunks: [] });
  const textRef = useRef(text);
  textRef.current = text;
  const done = useRef(false);

  const stop = () => {
    const c = r.current;
    clearInterval(c.tm);
    try { if (c.rec && c.rec.state !== 'inactive') c.rec.stop(); } catch { /* уже остановлен */ }
    try { c.sr?.stop(); } catch { /* уже остановлен */ }
    c.stream?.getTracks().forEach((x) => x.stop());
    setRunning(false);
  };
  const start = async () => {
    const c = r.current;
    c.final = ''; c.chunks = [];
    try {
      c.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      c.rec = new MediaRecorder(c.stream);
      c.rec.ondataavailable = (e) => c.chunks.push(e.data);
      c.rec.onstop = () => setUrl(URL.createObjectURL(new Blob(c.chunks, { type: c.rec?.mimeType })));
      c.rec.start();
    } catch { setMsg(t('Микрофон недоступен — печатай ответ.')); }
    if (SR) {
      try {
        const sr = new SR();
        sr.lang = 'en-US'; sr.continuous = true; sr.interimResults = true;
        sr.onresult = (ev) => {
          let it = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) { const x = ev.results[i]; if (x.isFinal) c.final += x[0].transcript + ' '; else it += x[0].transcript; }
          setText(c.final + it);
        };
        sr.onerror = () => {};
        sr.start(); c.sr = sr;
      } catch { /* нет распознавания — остаётся ручной ввод */ }
    }
    c.t0 = Date.now(); setElapsed(0); setRunning(true);
    c.tm = window.setInterval(() => setElapsed(Math.round((Date.now() - c.t0) / 1000)), 500);
  };
  useEffect(() => {
    if (autoAsk) speak(prompt, { rate: 0.95 });
    return () => { stopSpeak(); const c = r.current; clearInterval(c.tm); try { c.sr?.stop(); } catch { /* */ } try { if (c.rec && c.rec.state !== 'inactive') c.rec.stop(); } catch { /* */ } c.stream?.getTracks().forEach((x) => x.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (running && max && elapsed >= max) stop(); }, [elapsed, running, max]);

  return (
    <>
      {header}
      <div className="card" data-testid="record-answer">
        <div className="row"><span className="pill ielts">{label}</span><span className="sp" /><span className="timer" role="timer">{max ? fmtTime(Math.max(0, max - elapsed)) : fmtTime(elapsed)}</span></div>
        <Say state="think"><b>{prompt}</b>{points && <ul className="small">{points.map((x) => <li key={x}>{x}</li>)}</ul>}</Say>
        <div className="row" style={{ margin: '.8rem 0' }}>
          <button className="btn alt" onClick={() => speak(prompt, { rate: 0.95 })}>🔊 {t('Миша спрашивает')}</button>
          <button className="btn" data-testid="rec" onClick={() => (running ? stop() : start())}>{running ? '⏹ ' + t('Остановить') : '🎙️ ' + (elapsed ? t('Ещё раз') : t('Начать запись'))}</button>
        </div>
        <label htmlFor="ts">{t('Расшифровка (можно поправить или напечатать, если микрофона нет)')}</label>
        <textarea id="ts" data-testid="transcript" style={{ minHeight: 110 }} placeholder={t('Появится по ходу речи…')} value={text} onChange={(e) => setText(e.target.value)} />
        {url && <audio controls src={url} style={{ width: '100%' }} />}
        <div className="row" style={{ marginTop: '.6rem' }}>
          <span className="small mute">{msg}</span><span className="sp" />
          <button className="btn" data-testid="answer-next" onClick={() => { if (done.current) return; done.current = true; const secs = r.current.t0 ? Math.round((Date.now() - r.current.t0) / 1000) : 0; stop(); setTimeout(() => onDone({ label, prompt, transcript: textRef.current.trim(), secs, url }), 250); }}>{t('Дальше')}</button>
        </div>
      </div>
    </>
  );
}

type Step = { kind: 'a'; label: string; prompt: string; points?: string[]; max?: number; auto?: boolean } | { kind: 'prep'; topic: string; points: string[] };

/** Speaking Part 1–3 целиком: ответы → оценка (ИИ, long:true) или локальная. */
export function SpeakingFlow({ header, onDone }: { header?: ReactNode; onDone: (r: { res: GradeResult; answers: Answer[] }) => void }) {
  const P = useData((s) => s.D?.prompts.speaking);
  const steps = useMemo<Step[]>(() => {
    if (!P) return [];
    const c = pick(P.part2);
    return [
      ...shuffle(P.part1).slice(0, 3).map((q): Step => ({ kind: 'a', label: 'Part 1', prompt: q, auto: true })),
      { kind: 'prep', topic: c.topic, points: c.points },
      { kind: 'a', label: 'Part 2', prompt: c.topic, points: c.points, max: 120 },
      ...shuffle(P.part3).slice(0, 3).map((q): Step => ({ kind: 'a', label: 'Part 3', prompt: q, auto: true })),
    ];
  }, [P]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [prep, setPrep] = useState(60);
  const st = steps[i];

  useEffect(() => {
    if (st?.kind !== 'prep') return;
    setPrep(60);
    const id = setInterval(() => setPrep((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [i, st?.kind]);
  useEffect(() => { if (st?.kind === 'prep' && prep <= 0) setI((x) => x + 1); }, [prep, st?.kind]);

  const finish = async (all: Answer[]) => {
    setBusy(true);
    const tr = all.map((a) => `${a.label}: ${a.prompt}\nA: ${a.transcript || '(no answer)'}`).join('\n\n');
    const words = (tr.match(/A: [^\n]*/g) || []).join(' ').match(/[A-Za-z']+/g) || [];
    const secs = all.reduce((x, a) => x + a.secs, 0) || all.length * 20;
    let res = await gradeSpeaking('IELTS Speaking Parts 1-3', tr, Math.round(words.length / (secs / 60)));
    if (!res || typeof res.overall !== 'number') res = localSpeaking(all.map((a) => a.transcript).join(' '), secs);
    onDone({ res, answers: all });
  };
  if (!P) return null;
  if (busy) return <div className="card" data-testid="grading"><div className="skel" /><div className="skel" style={{ width: '70%' }} /></div>;
  if (!st) return null;
  if (st.kind === 'prep')
    return (
      <>{header}<div className="card" data-testid="prep">
        <Say state="board"><b>Part 2.</b> {st.topic}<ul>{st.points.map((x) => <li key={x}>{x}</li>)}</ul>{t('У тебя 1 минута на подготовку.')}</Say>
        <div className="row"><span className="timer" role="timer">{fmtTime(Math.max(0, prep))}</span><span className="sp" /><button className="btn" data-testid="prep-skip" onClick={() => setI(i + 1)}>{t('Я готов')}</button></div>
      </div></>
    );
  return (
    <RecordAnswer key={i} label={st.label} prompt={st.prompt} points={st.points} max={st.max} autoAsk={st.auto} header={header} onDone={(a) => {
      const all = [...answers, a];
      setAnswers(all);
      if (i >= steps.length - 1) finish(all); else setI(i + 1);
    }} />
  );
}
