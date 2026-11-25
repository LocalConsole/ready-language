import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { addDays, today } from '@/lib/util';
import { t } from '@/i18n';
import type { Lang } from '@/types';

export default function Start() {
  const nav = useNavigate();
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  const setProfile = useProgress((s) => s.setProfile);
  const old = useProgress((s) => s.profile);
  const [step, setStep] = useState(0);
  const [st, setSt] = useState({
    ielts: old ? old.goal.ielts > 0 : true,
    sat: old ? old.goal.sat > 0 : false,
    band: old?.goal.ielts || 7,
    satScore: old?.goal.sat || 1400,
    di: old?.dates.ielts || addDays(today(), 90),
    ds: old?.dates.sat || addDays(today(), 120),
  });

  const finish = (to: string) => {
    setProfile({
      goal: { ielts: st.ielts ? st.band : 0, sat: st.sat ? st.satScore : 0 },
      dates: { ielts: st.ielts ? st.di || null : null, sat: st.sat ? st.ds || null : null },
      created: old?.created || today(),
    });
    nav(to);
  };
  const toDates = () => {
    const bad = (st.ielts && st.di && st.di < today()) || (st.sat && st.ds && st.ds < today());
    if (bad) return toast(t('Дата экзамена уже прошла — выбери будущую'));
    setStep(2);
  };

  if (step === 0)
    return (
      <div className="card">
        <Mood state="hello" text={t('Привет! Я Миша — бывший двоечник, ныне преподаватель. Выбери, к чему готовимся.')} />
        <h2>{t('Цель')}</h2>
        <div className="grid g3">
          <button className="card opt" data-testid="goal-ielts" aria-pressed={st.ielts} style={{ margin: 0, borderColor: st.ielts ? 'var(--teal)' : undefined }} onClick={() => setSt({ ...st, ielts: !st.ielts })}>
            <h3>🎓 IELTS</h3><span className="small mute">Academic / General</span>
          </button>
          <button className="card opt" data-testid="goal-sat" aria-pressed={st.sat} style={{ margin: 0, borderColor: st.sat ? 'var(--teal)' : undefined }} onClick={() => setSt({ ...st, sat: !st.sat })}>
            <h3>📐 Digital SAT</h3><span className="small mute">Reading &amp; Writing + Math</span>
          </button>
        </div>
        <div className="row" style={{ marginTop: '1rem' }}>
          <select value={lang} aria-label={t('Язык интерфейса')} style={{ width: 'auto' }} onChange={(e) => void setLang(e.target.value as Lang)}>
            <option value="ru">Русский</option>
            <option value="uz">O'zbekcha</option>
            <option value="en">English</option>
          </select>
          <span className="sp" />
          <button className="btn" data-testid="start-next" onClick={() => (st.ielts || st.sat ? setStep(1) : toast(t('Выбери хотя бы один экзамен')))}>{t('Дальше')}</button>
        </div>
      </div>
    );

  if (step === 1)
    return (
      <div className="card">
        <Mood state="board" text={t('Поставим цель и дату — по ним посчитаю нагрузку.')} />
        {st.ielts && (
          <>
            <label htmlFor="band">IELTS target band: <b>{st.band}</b></label>
            <input id="band" type="range" min={5} max={9} step={0.5} value={st.band} style={{ width: '100%' }} onChange={(e) => setSt({ ...st, band: +e.target.value })} />
            <label htmlFor="di">{t('Дата IELTS')}</label>
            <input id="di" type="date" value={st.di} min={today()} onChange={(e) => setSt({ ...st, di: e.target.value })} />
          </>
        )}
        {st.sat && (
          <>
            <label htmlFor="sat">{t('SAT цель')}: <b>{st.satScore}</b></label>
            <input id="sat" type="range" min={1000} max={1600} step={10} value={st.satScore} style={{ width: '100%' }} onChange={(e) => setSt({ ...st, satScore: +e.target.value })} />
            <label htmlFor="ds">{t('Дата SAT')}</label>
            <input id="ds" type="date" value={st.ds} min={today()} onChange={(e) => setSt({ ...st, ds: e.target.value })} />
          </>
        )}
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="btn alt" onClick={() => setStep(0)}>{t('Назад')}</button>
          <span className="sp" />
          <button className="btn" data-testid="start-next2" onClick={toDates}>{t('Дальше')}</button>
        </div>
      </div>
    );

  return (
    <div className="card">
      <Mood state="think" text={t('С чего начнём? Диагностика займёт ~15 минут и покажет сильные и слабые места.')} />
      <div className="grid g2">
        <button className="card opt" data-testid="start-diag" style={{ margin: 0 }} onClick={() => finish('/diag')}>
          <h3>🧭 {t('Пройти диагностику')}</h3><span className="small mute">{t('адаптивный тест → уровень и персональный план')}</span>
        </button>
        <button className="card opt" data-testid="start-zero" style={{ margin: 0 }} onClick={() => finish('/home')}>
          <h3>🌱 {t('Начать с нуля')}</h3><span className="small mute">{t('идём по карте с первого урока')}</span>
        </button>
      </div>
    </div>
  );
}
