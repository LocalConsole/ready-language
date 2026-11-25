import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { topicName } from '@/lib/lessons';
import { t } from '@/i18n';

const CONF: Record<string, string> = {
  tenses_pp: 'путаешь Present Perfect и Past Simple', articles: 'путаешь артикли a / an / the', conditionals: 'путаешь типы условных предложений',
  passive: 'забываешь про пассив', prepositions: 'ошибаешься в предлогах', modal: 'путаешь mustn’t и don’t have to',
  subject_verb: 'ошибаешься в согласовании подлежащего и сказуемого', tfng: 'путаешь False и Not Given',
  listening_form: 'ловишься на самоисправлениях в Listening', sat_boundaries: 'ошибаешься на границах предложений (SAT)',
  sat_transitions: 'выбираешь не ту связку (SAT)', words: 'путаешь значения и написание слов',
};

export default function Journal() {
  const errs = useProgress((s) => s.errors);
  const removeError = useProgress((s) => s.removeError);
  const lessons = useData((s) => s.D?.lessons) || [];
  const by: Record<string, number> = {};
  errs.forEach((e) => (by[e.topic] = (by[e.topic] || 0) + e.count));
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <PageHead icon="📓" title={t('Журнал ошибок')} sub={t('Твоя личная тетрадь: ошибки возвращаются, пока не закрепятся.')} acc="danger" />
      <div className="card">
        {errs.length
          ? <Mood state="explain" text={top.length && CONF[top[0][0]] ? t('Чаще всего ты {x}. Давай сделаем из этого мини-урок.', { x: t(CONF[top[0][0]]) }) : t('Вот твоя личная тетрадь. Ошибки возвращаются через повторения, пока не закрепятся.')} />
          : <Mood state="celebrate" text={t('Пока ошибок нет — продолжай!')} />}
      </div>
      {errs.length > 0 && (
        <>
          <div className="card">
            <h3>{t('Мини-уроки по твоим слабым местам')}</h3>
            {top.slice(0, 5).map(([tp, n]) => {
              const L = lessons.find((l) => l.topic === tp);
              return (
                <div className="row" key={tp} style={{ padding: '.3rem 0' }}>
                  <span>{topicName(tp, t)}</span><span className="chip">{n}</span>
                  <span className="small mute sp">{CONF[tp] ? '→ ' + t(CONF[tp]) : ''}</span>
                  {L && <Link className="btn alt sm" to={'/lesson/' + L.id}>{t('Мини-урок')}</Link>}
                </div>
              );
            })}
            <div className="row" style={{ marginTop: '.6rem' }}>
              <Link className="btn" to="/journal/train" data-testid="journal-train">🎯 {t('Тренировка (3 ошибки)')}</Link>
              <Link className="btn alt" to="/review/journal">{t('Разбор всех')} ({errs.length})</Link>
            </div>
          </div>
          <div className="card">
            <h3>{t('Все записи')}</h3>
            <table className="tbl"><tbody>
              {errs.slice().reverse().slice(0, 60).map((e) => (
                <tr key={e.id} data-testid="journal-row">
                  <td><span className="pill">{e.skill}</span> {(e.q.q || '').slice(0, 80)}</td>
                  <td className="small mute">{e.date} ×{e.count}</td>
                  <td><button className="btn alt sm" aria-label={t('Удалить')} onClick={() => removeError(e.id)}>✕</button></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </>
      )}
    </>
  );
}
