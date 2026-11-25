import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { Bar, PageHead } from '@/components/ui';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { modulesFor, nextLesson } from '@/lib/lessons';
import { t } from '@/i18n';

export default function Path() {
  const D = useData((s) => s.D);
  const s = useProgress();
  const nl = nextLesson(D, s);
  return (
    <>
      <PageHead icon="🗺️" title={t('Карта пути')} sub={t('Модули → уроки → шаги. Жёлтая рамка — твой следующий шаг, зелёная — пройдено.')} acc="vocab" />
      {nl && <div className="card"><Mood state="board" text={<>{t('Следующая остановка')}: <b>{t(nl.title)}</b>.</>} /></div>}
      <div className="map">
        {modulesFor(D, s).map((m) => {
          const ls = D.lessons.filter((l) => l.module === m.id);
          const n = ls.filter((l) => s.lessons[l.id]).length;
          return (
            <div className="mod" data-acc={m.id} key={m.id}>
              <h3>{m.icon} {t(m.title)} <span className="chip">{n}/{ls.length}</span></h3>
              <Bar value={ls.length ? n / ls.length : 0} style={{ marginBottom: '.6rem' }} label={m.title} />
              <div className="road">
                {ls.map((l) => {
                  const done = s.lessons[l.id];
                  return (
                    <Link key={l.id} to={'/lesson/' + l.id} className={`node ${done ? 'done' : nl?.id === l.id ? 'next' : ''}`} data-testid={'lesson-' + l.id}>
                      <span className="ic">{done ? '✅' : l.icon}</span>
                      <span><b>{t(l.title)}</b><br /><span className="small mute">{l.min} {t('мин')} {done ? '· ' + done.score + '%' : ''}</span></span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
