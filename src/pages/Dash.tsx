import { PageHead, Bar } from '@/components/ui';
import { LineChart } from '@/features/exams/Report';
import { useProgress } from '@/store/progress';
import { estimate, studiedHours } from '@/lib/plan';
import { topicName } from '@/lib/lessons';
import { addDays, dayDiff, today } from '@/lib/util';
import { t } from '@/i18n';
import type { ExamRecord } from '@/types';

function forecast(arr: ExamRecord[], key: 'band' | 'sat', goal: number): string {
  if (arr.length < 2) return t('нужно ≥2 пробника для прогноза');
  const f = arr[0], l = arr[arr.length - 1];
  const lv = (l[key] ?? 0) as number, fv = (f[key] ?? 0) as number;
  const wk = Math.max(1, dayDiff(f.date, l.date) / 7);
  const slope = (lv - fv) / wk;
  if (lv >= goal) return '🎉 ' + t('цель уже достигнута');
  if (slope <= 0) return t('рост пока не виден — добавь практики');
  const w = Math.ceil((goal - lv) / slope);
  return `≈ ${w} ${t('нед.')} (${t('к')} ${addDays(today(), w * 7)})`;
}

export default function Dash() {
  const s = useProgress();
  const est = estimate(s);
  const goal: { ielts?: number; sat?: number } = s.profile?.goal || {};
  const sk: [string, number][] = Object.entries(s.stats).map(([k, v]) => [k, v.w ? v.wok / v.w : 0]);
  if (s.diag) Object.entries(s.diag.skills).forEach(([k, v]) => { if (!sk.find((x) => x[0] === k)) sk.push([k, v]); });
  const by: Record<string, number> = {};
  s.errors.forEach((e) => (by[e.topic] = (by[e.topic] || 0) + e.count));
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const days = Array.from({ length: 7 }, (_, i) => { const d = addDays(today(), i - 6); return [d.slice(5), s.daily[d]?.min || 0] as [string, number]; });
  const maxm = Math.max(30, ...days.map((x) => x[1]));
  const dow = (new Date().getDay() + 6) % 7;
  const heat = Array.from({ length: 85 + dow }, (_, k) => { const d = addDays(today(), -(84 + dow - k)); const m = s.daily[d]?.min || 0; return { d, m, l: m === 0 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : 4 }; });
  const ie = s.exams.filter((e) => e.type === 'ielts'), se = s.exams.filter((e) => e.type === 'sat');
  return (
    <>
      <PageHead icon="📈" title={t('Прогресс')} sub={t('Прогноз балла, навыки, активность и когда ты достигнешь цели.')} acc="writing" />
      <div className="grid g3">
        <div className="card center"><div className="small mute">{t('Прогноз IELTS')}</div><h1 style={{ margin: 0 }} data-testid="est-ielts">{est.band ?? '—'}</h1><div className="small">{t('цель')} {goal.ielts || '—'}</div></div>
        <div className="card center"><div className="small mute">{t('Прогноз SAT')}</div><h1 style={{ margin: 0 }} data-testid="est-sat">{est.sat ?? '—'}</h1><div className="small">{t('цель')} {goal.sat || '—'}</div></div>
        <div className="card center"><div className="small mute">{t('Время учёбы')}</div><h1 style={{ margin: 0 }}>{Math.round(studiedHours(s) * 10) / 10} {t('ч')}</h1><div className="small">{t('серия')} {s.streak.count} {t('дн.')}</div></div>
      </div>
      <div className="grid g2">
        <div className="card"><h3>{t('По навыкам')}</h3>
          {sk.length ? sk.map(([k, v]) => <div className="row" key={k} style={{ margin: '.35rem 0' }}><b style={{ width: 80 }}>{k}</b><div className="sp"><Bar value={v * 100} /></div><span className="small">{Math.round(v * 100)}%</span></div>) : <p className="mute">{t('Пройди диагностику или пару уроков.')}</p>}</div>
        <div className="card"><h3>{t('Частые ошибки')}</h3>
          {top.length ? top.map(([k, n]) => <div className="row" key={k}><span className="sp">{topicName(k, t)}</span><span className="chip">{n}</span></div>) : <p className="mute">{t('Ошибок пока нет.')}</p>}</div>
      </div>
      <div className="card"><h3>{t('Последние 7 дней (мин)')}</h3>
        <div className="row" style={{ alignItems: 'flex-end', height: 110, gap: '.5rem' }}>
          {days.map(([d, m]) => <div key={d} style={{ flex: 1, textAlign: 'center' }}><div style={{ height: Math.max(3, (m / maxm) * 80), background: 'var(--teal)', borderRadius: '6px 6px 0 0' }} /><div className="small mute">{d}</div><div className="small">{m}</div></div>)}
        </div></div>
      <div className="card"><h3>{t('Активность (12 недель)')}</h3>
        <div className="heat" role="img" aria-label={t('Тепловая карта активности')}>{heat.map((h) => <i key={h.d} title={`${h.d}: ${h.m} ${t('мин')}`} data-l={h.l} />)}</div></div>
      <div className="card"><h3>{t('Когда достигнешь цели')}</h3>
        {goal.ielts ? <><p>IELTS: <span data-testid="fc-ielts">{forecast(ie, 'band', goal.ielts)}</span></p><LineChart vals={ie.map((x) => x.band ?? 0)} range={[3, 9]} /></> : null}
        {goal.sat ? <><p>SAT: {forecast(se, 'sat', goal.sat)}</p><LineChart vals={se.map((x) => x.sat ?? 0)} range={[400, 1600]} /></> : null}
        <p className="small mute">{t('Оценки приблизительные: опираются на пробники и диагностику, а не на официальный балл.')}</p></div>
    </>
  );
}
