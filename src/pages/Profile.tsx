import { Link } from 'react-router-dom';
import { Mascot, asset, useOutfit } from '@/components/Mascot';
import { Bar, PageHead } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { level, lvlProgress } from '@/lib/plan';
import { ACH } from '@/lib/achievements';
import { t } from '@/i18n';

export default function Profile() {
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak.count);
  const ach = useProgress((s) => s.achievements);
  const o = useOutfit();
  const items: [string, boolean, string][] = [
    ['Шарф', !!o.scarf, 'уровень 3'],
    ['Новая шапка', !!o.hat, 'уровень 5'],
    ['Самовар', !!o.samovar, 'уровень 4 или 7 дней подряд'],
  ];
  return (
    <>
      <PageHead icon="🐻" title={t('Миша и ты')} sub={t('Твой уровень, достижения и гардероб Миши.')} acc="speaking" />
      <div className="card">
        <div className="grid g2">
          <div style={{ maxWidth: 240, margin: 'auto', textAlign: 'center' }}>
            <img className="avatar" src={asset('avatar.webp')} alt={t('Миша')} width={150} height={150} />
            <Mascot state="hello" style={{ width: 150, margin: '.4rem auto 0' }} />
          </div>
          <div>
            <h2>{t('Уровень')} {level(xp)}</h2>
            <p>{xp} XP · {t('серия')} {streak} {t('дн.')}</p>
            <Bar value={lvlProgress(xp)} label={t('Уровень')} />
            <h3 style={{ marginTop: '1rem' }}>{t('Гардероб')}</h3>
            {items.map(([n, on, h]) => <div key={n}>{on ? '✅' : '🔒'} {t(n)} <span className="small mute">({t(h)})</span></div>)}
          </div>
        </div>
      </div>
      <div className="card">
        <h3>{t('Достижения')}</h3>
        <div className="grid g3">
          {Object.entries(ACH).map(([k, [i, n]]) => (
            <div className="row" key={k} style={{ opacity: ach.includes(k) ? 1 : 0.35 }} data-unlocked={ach.includes(k) ? '1' : '0'}>
              <span style={{ fontSize: '1.6rem' }} aria-hidden="true">{i}</span><span>{t(n)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="row">
        <Link className="btn alt" to="/settings">⚙️ {t('Настройки')}</Link>
        <Link className="btn alt" to="/sources">📜 {t('Откуда материалы')}</Link>
        <Link className="btn alt" to="/start">🎯 {t('Изменить цель')}</Link>
      </div>
    </>
  );
}
