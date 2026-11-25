import { t } from '@/i18n';
export const Banner = ({ title, sec }: { title: string; sec: string }) => (
  <div className="card" style={{ background: '#1f2d3d', color: '#fff', marginBottom: '.6rem', padding: '.6rem 1rem' }}>
    <b>{title}</b> · {sec} <span className="small" style={{ opacity: 0.7 }}>· {t('режим экзамена: без подсказок, только таймер')}</span>
  </div>
);
