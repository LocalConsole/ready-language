import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Quiz } from '@/components/Quiz';
import { Mood, Say } from '@/components/Mascot';
import { Bar, Html, Pill } from '@/components/ui';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { useAllWords } from '@/lib/hooks';
import { explainSimpler, extraQuestion } from '@/lib/aiTasks';
import { makeVQ } from '@/lib/vocabQuestions';
import { topicName } from '@/lib/lessons';
import { escapeHtml, stripTags } from '@/lib/sanitize';
import { playSound, speak } from '@/lib/fx';
import { pick } from '@/lib/util';
import { toast } from '@/store/ui';
import { t } from '@/i18n';
import type { Question, ReviewItem, ReviewText } from '@/types';

type Item = ReviewItem | ReviewText;

export default function MistakeReview() {
  const { src } = useParams();
  const errors = useProgress((s) => s.errors);
  const last = useProgress((s) => s.lastReview);
  const source = useMemo(
    () => (src === 'journal' ? { title: t('Журнал ошибок'), items: errors.slice().reverse().map((e): ReviewItem => ({ kind: 'q', q: e.q, ans: e.ans })), extra: [] as ReviewText[] } : last),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [src],
  );
  const [skill, setSkill] = useState('all');
  const [topic, setTopic] = useState('all');
  const [idx, setIdx] = useState(0);
  if (!source || (!source.items.length && !source.extra?.length))
    return <div className="card center" data-testid="review-empty"><Mood state="celebrate" text={t('Ошибок нет — разбирать нечего. Редкая чистота!')} /><p><Link className="btn" to="/home">{t('На главную')}</Link></p></div>;
  const all: Item[] = [...source.items, ...(source.extra || [])];
  const sk = (x: Item) => (x.kind === 'q' ? x.q.skill : x.skill);
  const L = all.filter((x) => (skill === 'all' || sk(x) === skill) && (topic === 'all' || (x.kind === 'q' && x.q.topic === topic)));
  const i = Math.min(idx, Math.max(0, L.length - 1));
  const it = L[i];
  const skills = [...new Set(all.map(sk))];
  const topics = [...new Set(all.filter((x): x is ReviewItem => x.kind === 'q').map((x) => x.q.topic))];
  const next = () => { setIdx(i + 1); scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <>
      <h2>{t('Разбор ошибок')}</h2>
      <p className="small mute">{source.title} · {t('ошибок')}: {all.length}. {t('Ни одна не пропускается — просмотри все по порядку.')}</p>
      <div className="row" style={{ marginBottom: '.8rem' }}>
        <select aria-label={t('Навык')} value={skill} onChange={(e) => { setSkill(e.target.value); setIdx(0); }} style={{ width: 'auto' }}>
          <option value="all">{t('Все навыки')}</option>{skills.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label={t('Тема')} value={topic} onChange={(e) => { setTopic(e.target.value); setIdx(0); }} style={{ width: 'auto' }}>
          <option value="all">{t('Все темы')}</option>{topics.map((s) => <option key={s} value={s}>{topicName(s, t)}</option>)}
        </select>
        <span className="sp" /><span className="chip" data-testid="review-pos">{t('Ошибка')} {L.length ? i + 1 : 0} {t('из')} {L.length}</span>
      </div>
      <Bar value={L.length ? ((i + 1) / L.length) * 100 : 0} />
      <div style={{ marginTop: '1rem' }}>{it && <ItemView key={(it.kind === 'q' ? it.q.id : it.original) + i} it={it} onUnderstood={() => { playSound('ok'); toast(t('Отмечено ✓')); if (i < L.length - 1) next(); }} />}</div>
      <div className="row" style={{ marginTop: '1rem' }}>
        <button className="btn alt" disabled={!i} onClick={() => setIdx(i - 1)}>← {t('Назад')}</button><span className="sp" />
        {i < L.length - 1 ? <button className="btn" data-testid="review-next" onClick={next}>{t('Далее')} →</button> : <Link className="btn ok" to="/home">{t('Готово — на главную')}</Link>}
      </div>
    </>
  );
}

function ItemView({ it, onUnderstood }: { it: Item; onUnderstood: () => void }) {
  if (it.kind === 'text')
    return (
      <div className="card"><Mood state="explain" text={t('Разберём предложение построчно.')} /><h3>{it.title || t('Исправление')}</h3>
        <table className="tbl"><tbody><tr><td>❌</td><td>{it.original}</td></tr><tr><td>✅</td><td><b>{it.fix}</b></td></tr><tr><td>💡</td><td>{it.why || ''}</td></tr></tbody></table></div>
    );
  return <QItem it={it} onUnderstood={onUnderstood} />;
}

function QItem({ it, onUnderstood }: { it: ReviewItem; onUnderstood: () => void }) {
  const q = it.q;
  const D = useData((s) => s.D);
  const words = useAllWords();
  const inJ = useProgress((s) => s.errors.some((e) => e.qid === q.id));
  const toggleJournal = useProgress((s) => s.toggleJournal);
  const p = q.passage ? D?.passages[q.passage] : null;
  const L = q.typ !== 'mcq';
  const mine = it.ans == null ? t('— (пропущено)') : L ? String(it.ans || '—') : q.opts[it.ans as number];
  const right = L ? q.answer || '' : q.opts[q.a];
  const [ai, setAi] = useState<{ state: 'idle' | 'load' | 'done'; text: string | null }>({ state: 'idle', text: null });
  const [sim, setSim] = useState<{ q: Question | null; res: boolean | null; empty: boolean } | null>(null);

  const simpler = async () => {
    setAi({ state: 'load', text: null });
    setAi({ state: 'done', text: await explainSimpler(q, it.ans) });
  };
  const tryOne = async () => {
    setSim({ q: null, res: null, empty: false });
    let pool = (D?.questions || []).filter((x) => x.topic === q.topic && x.id !== q.id && !x.passage);
    if (q.wid) pool = [makeVQ(pick(words.filter((w) => w.id !== q.wid)), 'tr', words)];
    const s2 = pool.length ? pick(pool) : await extraQuestion(q.topic, topicName(q.topic, t), q.lvl || 2);
    setSim(s2 ? { q: s2, res: null, empty: false } : { q: null, res: null, empty: true });
  };
  const why = L ? t('Ответ не совпал с эталоном — сверь написание/смысл.') : it.ans == null ? t('Вариант не выбран — на экзамене лучше всегда выбирать наиболее вероятный ответ.') : q.wrong[it.ans as number] ? `«${mine}» — ${q.wrong[it.ans as number]}` : `«${mine}» ${t('не подходит — сравни с правилом в пункте 3.')}`;
  return (
    <div className="card stagger top" data-testid="review-item">
      <Say state="sad">{t('Ничего страшного — разберём, и в следующий раз будет проще.')}</Say>
      <div><Pill kind={q.skill}>{q.skill}</Pill> <Pill>{topicName(q.topic, t)}</Pill> {q.exam && <Pill kind={q.exam}>{q.exam}</Pill>} <span className="small mute">· {t('источник')}: {q.src || ''}</span></div>
      <div className="rs q"><h3><span className="n">1</span>{t('Вопрос')}</h3>
        {p && p.skill === 'reading' && <div className="passage">{p.text}</div>}
        <p style={{ margin: '.3rem 0' }}><b>{q.q}</b></p>
        {!L && <ol type="A" className="small">{q.opts.map((o, k) => <li key={k}>{o}</li>)}</ol>}</div>
      <div className="rs mine"><h3><span className="n">✗</span>{t('Твой ответ')}</h3><b style={{ color: 'var(--bad)' }}>{mine}</b></div>
      <div className="rs right"><h3><span className="n">✓</span>{t('Правильный ответ')}</h3><b style={{ color: 'var(--ok)' }}>{right}</b></div>
      <div className="rs why"><h3><span className="n">3</span>{t('Почему именно так')}</h3>{q.ai ? <span>{q.expl}</span> : <Html html={q.expl} />}</div>
      <div className="rs no"><h3><span className="n">4</span>{t('Почему другие варианты не подходят')}</h3>{why}</div>
      {p && p.skill === 'listening' && <div className="rs au"><h3><span className="n">6</span>{t('Аудио и транскрипт')}</h3><button className="btn alt sm" onClick={() => speak(q.key || p.text, { rate: 0.9 })}>▶ {t('Прослушать фрагмент')}</button><div className="passage" style={{ margin: '.5rem 0 0' }}>{p.text}</div></div>}
      {p && p.skill === 'reading' && q.key && <div className="expl small"><b>{t('Где в тексте')}:</b> «{q.key}»</div>}
      {sim && (
        <div id="sim">
          {!sim.q && !sim.empty && <div className="skel" />}
          {sim.empty && <div className="expl">{t('Похожих заданий пока нет. Загляни в уроки по теме.')}</div>}
          {sim.q && sim.res === null && (
            <div className="card" data-testid="try-quiz"><Quiz title={t('Теперь сам')} questions={[sim.q]} feedback onDone={(r) => { useProgress.getState().record(r.results); setSim({ q: sim.q, res: r.ok > 0, empty: false }); }} /></div>
          )}
          {sim.res !== null && (
            <><Say state={sim.res ? 'happy' : 'cheer'}>{sim.res ? '🎉 ' + t('Получилось! Тема закрепляется.') : t('Ничего, она вернётся в повторение — ошибка уже в журнале.')}</Say>
              <div className="row"><button className="btn" onClick={tryOne}>🎯 {t('Ещё один похожий')}</button><button className="btn alt" onClick={() => setSim(null)}>{t('Закрыть')}</button></div></>
          )}
        </div>
      )}
      <div className="hint">👉 <span>{t('Нажми «Попробуй сам» — Миша даст похожий вопрос, чтобы закрепить.')}</span></div>
      <div className="row" style={{ marginTop: '.8rem' }}>
        <button className="btn alt sm" data-testid="understood" onClick={onUnderstood}>✓ {t('Понял')}</button>
        <button className="btn alt sm" data-testid="simpler" onClick={simpler} disabled={ai.state === 'load'}>🧸 {t('Объясни проще')}</button>
        <button className="btn alt sm" data-testid="journal-toggle" onClick={() => toggleJournal(q, it.ans)}>📓 {inJ ? t('В журнале') : t('В журнал')}</button>
        <button className="btn sm" data-testid="try" onClick={tryOne}>🎯 {t('Попробуй сам')}</button>
      </div>
      {ai.state === 'load' && <><div className="skel" /><div className="skel" style={{ width: '70%' }} /></>}
      {ai.state === 'done' && (ai.text
        ? <Say state="explain"><span data-testid="ai-expl" dangerouslySetInnerHTML={{ __html: escapeHtml(ai.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') }} /></Say>
        : <div className="expl" data-testid="ai-fallback">{t('ИИ сейчас недоступен')}. {t('Упрощённо')}: {stripTags(q.expl).split('.').slice(0, 2).join('.')}.</div>)}
    </div>
  );
}
