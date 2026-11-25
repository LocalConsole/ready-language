import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { Bar } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { minutesPerDay } from '@/lib/plan';
import { confetti } from '@/lib/fx';
import { t } from '@/i18n';

export function LineChart({ vals, range }: { vals: number[]; range: [number, number] }) {
  if (!vals.length) return <p className="mute">{t('Данных пока нет.')}</p>;
  const W = 320, H = 120, p = 16, [mn, mx] = range;
  const pts = vals.map((v, i) => [p + (vals.length === 1 ? (W - 2 * p) / 2 : (i * (W - 2 * p)) / (vals.length - 1)), H - p - ((v - mn) / (mx - mn)) * (H - 2 * p)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Динамика')} style={{ width: '100%', maxWidth: 420 }}>
      <polyline fill="none" stroke="var(--brand)" strokeWidth={3} strokeLinejoin="round" points={pts.map((x) => x.join(',')).join(' ')} />
      {pts.map((q, i) => <g key={i}><circle cx={q[0]} cy={q[1]} r={4} fill="var(--brand)" /><text x={q[0]} y={q[1] - 8} fontSize={10} textAnchor="middle" fill="currentColor">{vals[i]}</text></g>)}
    </svg>
  );
}

export default function Report() {
  const { id } = useParams();
  const s = useProgress();
  const e = s.exams.find((x) => x.id === id);
  useEffect(() => { if (e) confetti(100); }, [e?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!e) return <Navigate to="/exam" replace />;
  const hist = s.exams.filter((x) => x.type === e.type);
  const key = e.type === 'ielts' ? 'band' : 'sat';
  const val = (e[key] ?? 0) as number;
  const prev = hist[hist.indexOf(e) - 1];
  const d = prev ? val - ((prev[key] ?? 0) as number) : null;
  const max = e.type === 'ielts' ? 9 : 800;
  const goal = s.profile?.goal?.[e.type];
  const rv = s.lastReview;
  return (
    <div className="card" data-testid="report">
      <Mood state="celebrate" text={<>{t('Экзамен завершён! Итог:')} <b style={{ fontSize: '1.4rem' }} data-testid="report-score">{val}</b>{d != null && ` (${d >= 0 ? '+' : ''}${Math.round(d * 10) / 10} ${t('к прошлому')})`}</>} />
      <h3>{t('Разбивка')}</h3>
      {Object.entries(e.parts).map(([k, v]) => (
        <div key={k} style={{ margin: '.5rem 0' }}><div className="row"><b className="sp" style={{ textTransform: 'capitalize' }}>{k}</b><b>{v}</b></div><Bar value={(v / max) * 100} /></div>
      ))}
      <h3>{t('Динамика')}</h3>
      <LineChart vals={hist.map((x) => (x[key] ?? 0) as number)} range={e.type === 'ielts' ? [3, 9] : [400, 1600]} />
      <p>{t('Цель')}: <b>{goal ?? '—'}</b>. {t('Обновлённый план')}: <b>{minutesPerDay(s)}</b> {t('мин/день')}.</p>
      <div className="row">
        {rv && (rv.items.length > 0 || rv.extra.length > 0) && <Link className="btn alt" to="/review">{t('Разбор ошибок с Мишей')}</Link>}
        <Link className="btn" to="/dash">{t('Весь прогресс')}</Link>
      </div>
    </div>
  );
}
