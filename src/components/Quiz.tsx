import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { QResult, Question, QuizResult } from '@/types';
import { Html, Bar, Pill } from './ui';
import { Mascot } from './Mascot';
import { getD } from '@/data';
import { playSound, speak, stopSpeak } from '@/lib/fx';
import { fmtTime } from '@/lib/util';
import { t } from '@/i18n';

export interface QuizProps {
  questions?: Question[];
  /** Адаптивный режим: вопрос выбирается по результатам предыдущих. Вернуть null — закончить. */
  next?: (results: QResult[], i: number) => Question | null;
  total?: number;
  feedback?: boolean;
  /** Секунды на всю сессию (экзаменационный режим) */
  timer?: number;
  /** Аудио Listening можно прослушать только один раз */
  once?: boolean;
  title: string;
  header?: ReactNode;
  onDone: (r: QuizResult) => void;
}

const LETTERS = 'ABCDEFGH';

/** Движок тестов: mcq / ввод слова / предложение, режим с разбором после каждого ответа или «экзаменационный». */
export function Quiz({ questions, next, total, feedback = false, timer, once, title, header, onDone }: QuizProps) {
  const total_ = total ?? questions?.length ?? 0;
  const [i, setI] = useState(0);
  const resultsRef = useRef<QResult[]>([]);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [left, setLeft] = useState(timer || 0);

  const finish = useCallback(
    (timeUp: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      stopSpeak();
      const results = resultsRef.current;
      onDoneRef.current({ results, total: total_ || results.length, ok: results.filter((r) => r.ok).length, timeUp });
    },
    [total_],
  );

  // Вопрос вычисляется один раз на шаг (для адаптивного режима next() не должен вызываться на каждом рендере)
  const [q, setQ] = useState<Question | null>(() => (next ? next([], 0) : questions?.[0] ?? null));
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);
  useEffect(() => {
    if (timer && left <= 0) finish(true);
  }, [left, timer, finish]);
  useEffect(() => () => stopSpeak(), []);
  useEffect(() => {
    if (!q) finish(false);
  }, [q, finish]);

  const advance = (r: QResult) => {
    resultsRef.current = [...resultsRef.current, r];
    const ni = i + 1;
    if (ni >= total_) return finish(false);
    const nq = next ? next(resultsRef.current, ni) : questions?.[ni] ?? null;
    stopSpeak();
    setI(ni);
    setQ(nq);
    setStartedAt(Date.now());
    if (!nq) finish(false);
  };

  if (!q) return null;
  return (
    <>
      {header}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.16 }}>
          <QuestionCard q={q} i={i} total={total_} left={timer ? left : 0} title={title} feedback={feedback} once={once} startedAt={startedAt} onAnswered={advance} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

interface CardProps {
  q: Question;
  i: number;
  total: number;
  left: number;
  title: string;
  feedback: boolean;
  once?: boolean;
  startedAt: number;
  onAnswered: (r: QResult) => void;
}

function QuestionCard({ q, i, total, left, title, feedback, once, startedAt, onAnswered }: CardProps) {
  const D = getD();
  const p = q.passage ? D.passages[q.passage] : null;
  const isL = p?.skill === 'listening';
  const [ans, setAns] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<QResult | null>(null);
  const [played, setPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [subs, setSubs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const answered = result !== null;

  useEffect(() => {
    if (q.typ !== 'mcq') inputRef.current?.focus();
  }, [q]);

  const commit = (skipped: boolean, chosen: number | null = ans) => {
    if (answered) return;
    stopSpeak();
    setPlaying(false);
    let ok = false;
    let a: number | string | null = null;
    if (!skipped) {
      if (q.typ === 'mcq') {
        a = chosen;
        ok = chosen === q.a;
      } else {
        const v = typed.trim();
        a = v;
        const want = (q.answer || '').toLowerCase();
        ok = q.typ === 'sent' ? v.toLowerCase().includes(want.slice(0, Math.max(4, want.length - 3))) && v.split(/\s+/).length >= 4 : v.toLowerCase() === want;
      }
    }
    const r: QResult = { q, ans: a, ok, ms: Date.now() - startedAt };
    if (feedback) {
      playSound(ok ? 'ok' : 'bad');
      setResult(r);
    } else onAnswered(r);
  };

  const pick = (k: number) => {
    if (answered) return;
    playSound('tap');
    setAns(k);
    if (feedback) commit(false, k);
  };

  const play = async () => {
    if (once && played) return;
    setPlayed(true);
    setPlaying(true);
    await speak(p!.text, { dialog: true, rate: 0.92 });
    setPlaying(false);
  };

  // клавиши A–D / 1–4 выбирают вариант, Enter — «дальше»
  useEffect(() => {
    if (q.typ !== 'mcq') return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (k >= 0 && k < q.opts.length && !answered) pick(k);
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  });

  const hlTranscript = useMemo(() => {
    if (!p) return null;
    if (!q.key || !p.text.includes(q.key)) return <>{p.text}</>;
    const [a, ...rest] = p.text.split(q.key);
    return <>{a}<mark>{q.key}</mark>{rest.join(q.key)}</>;
  }, [p, q.key]);

  const showWhy = result && !result.ok && q.typ === 'mcq' && typeof result.ans === 'number' && q.wrong[result.ans];
  const goLabel = q.typ === 'mcq' ? t('Дальше') : t('Проверить');

  return (
    <div className="card top" data-acc={accOf(q.skill)}>
      <div className="q-head">
        <Pill kind={q.skill}>{title}</Pill>
        <span className="small mute qn">{t('Вопрос {n} из {total}', { n: i + 1, total })}</span>
        <span className="sp" />
        {left !== undefined && left > 0 && <span className={`timer ${left <= 60 ? 'low' : ''}`} role="timer" aria-label={t('Осталось времени')}>{fmtTime(left)}</span>}
      </div>
      <Bar value={i / Math.max(total, 1)} style={{ marginBottom: '.8rem' }} label={t('Прогресс теста')} />
      {p && !isL && (
        <div className="passage" tabIndex={0}>
          <b>{p.title}</b>
          {'\n\n'}
          {p.text}
        </div>
      )}
      {isL && p && (
        <>
          <div className="row" style={{ marginBottom: '.6rem' }}>
            <button className="btn alt" onClick={play} disabled={(!!once && played && !playing) || playing}>{playing ? '🔊 ' + t('Играет…') : played ? '▶ ' + t('Ещё раз') : '▶ ' + t('Слушать')}</button>
            {playing && <button className="btn alt" onClick={() => { stopSpeak(); setPlaying(false); }}>⏹ {t('Стоп')}</button>}
            {!once && <span className="small mute">{t('можно переслушать')}</span>}
            <label className="small inline"><input type="checkbox" checked={subs} onChange={(e) => setSubs(e.target.checked)} /> {t('субтитры')}</label>
          </div>
          {(subs || answered) && <div className="passage">{hlTranscript}</div>}
        </>
      )}
      {q.audio && (
        <div className="row"><button className="btn alt" onClick={() => speak(q.audio!, { rate: 0.8 })}>🔊 {t('Слушать слово')}</button></div>
      )}
      <h3 id="qq">{q.q}</h3>
      {q.typ === 'mcq' ? (
        q.opts.map((o, k) => {
          const cls = answered ? (k === q.a ? 'good' : k === result.ans ? 'bad' : '') : ans === k ? 'sel' : '';
          return (
            <button key={k} className={`opt ${cls}`} disabled={answered} aria-pressed={ans === k} onClick={() => pick(k)}>
              <i className="lt">{LETTERS[k]}</i>
              <span>{o}</span>
            </button>
          );
        })
      ) : (
        <>
          <input ref={inputRef} type="text" value={typed} disabled={answered} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label={t('Ответ')} placeholder={t('Твой ответ…')} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), answered ? onAnswered(result!) : commit(false))} />
          {q.hint && <div className="small mute">{t('Подсказка')}: {q.hint}</div>}
        </>
      )}
      {answered && (
        <div className="say" style={{ marginTop: '.8rem' }} data-testid="feedback">
          <Mascot state={result.ok ? 'happy' : 'sad'} still style={{ width: 74 }} />
          <div className={`expl ${result.ok ? 'good' : 'bad'}`} style={{ flex: 1 }}>
            <b className="vd">{result.ok ? '✅ ' + t('Верно!') : '❌ ' + t('Неверно')}</b>
            {q.typ !== 'mcq' && <><br />{t('Правильный ответ')}: <b>{q.answer}</b></>}
            <br />
            <Html html={q.expl} />
            {showWhy && <div className="small" style={{ marginTop: '.4rem' }}>❌ {q.wrong[result.ans as number]}</div>}
          </div>
        </div>
      )}
      <div className="row" style={{ marginTop: '.8rem' }}>
        {!answered && <button className="btn alt sm" onClick={() => commit(true)}>{t('Пропустить')}</button>}
        <span className="sp" />
        <button
          className="btn"
          data-testid="quiz-go"
          disabled={!answered && q.typ === 'mcq' && ans === null}
          onClick={() => (answered ? onAnswered(result!) : commit(false))}
        >
          {answered ? t('Дальше') : goLabel}
        </button>
      </div>
    </div>
  );
}

export const accOf = (skill: string) => ({ vocab: 'vocab', grammar: 'grammar', reading: 'reading', listening: 'listening', rw: 'sat_rw', math: 'sat_math' })[skill] || 'vocab';
