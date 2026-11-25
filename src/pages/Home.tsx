import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { Ring, Row } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { useData } from '@/data';
import { today, dayDiff } from '@/lib/util';
import { dueCards } from '@/lib/srs';
import { daysLeft, estimate, level, lvlProgress, minutesPerDay } from '@/lib/plan';
import { nextLesson } from '@/lib/lessons';
import { t } from '@/i18n';
import type { MishaState } from '@/types';

export default function Home() {
  const s = useProgress();
  const D = useData((x) => x.D);
  const p = s.profile!;
  const d = today();
  const rec = s.daily[d] || { xp: 0, min: 0 };
  const m = s.mission[d] || {};
  const plan = minutesPerDay(s);
  const dl = daysLeft(s);
  const est = estimate(s);
  const due = dueCards(s.cards, 'word').length;
  const nl = nextLesson(D, s);
  const errs = s.errors.length;
  const lost = !!s.streak.last && dayDiff(s.streak.last, d) > 1;
  const doneAll = m.words && m.lesson && m.errors;
  const state: MishaState = doneAll ? 'celebrate' : lost ? 'sad' : rec.min > 0 ? 'cheer' : 'hello';

  const tasks = [
    { k: 'words', acc: 'vocab', ic: '📚', title: due ? t('Повтори слова: {n} к повторению', { n: due }) : t('Выучи 5 новых слов'), sub: t('≈ 5 мин'), to: due ? '/vocab/review' : '/vocab/new' },
    { k: 'lesson', acc: nl ? nl.module : 'sat', ic: nl ? nl.icon : '🏁', title: nl ? t('Урок: {title}', { title: t(nl.title) }) : t('Все уроки пройдены!'), sub: nl ? t('≈ {n} мин', { n: nl.min }) : t('Запусти пробный экзамен'), to: nl ? '/lesson/' + nl.id : '/exam' },
    { k: 'errors', acc: 'danger', ic: '📓', title: errs ? t('Разбери ошибки (3 из журнала)') : t('Быстрый тест на 5 вопросов'), sub: t('≈ 5 мин'), to: errs ? '/journal/train' : '/quick' },
  ];

  return (
    <>
      <div className="card">
        <Mood state={state} text={doneAll ? t('Миссия дня выполнена! Самовар на стол.') : lost ? t('Серия прервалась… но мы начнём новую. Я никуда не ушёл.') : t('Давай начнём с миссии дня — всего 15–20 минут.')} />
      </div>
      <div className="grid g3">
        <div className="card row" style={{ margin: 0 }}>
          <Ring pct={Math.min(1, rec.min / plan)} label={rec.min + '′'} />
          <div><b>{t('Сегодня')}</b><div className="small mute">{t('цель {n} мин', { n: plan })}</div></div>
        </div>
        <div className="card row" style={{ margin: 0 }}>
          <Ring pct={lvlProgress(s.xp)} label={level(s.xp)} color="var(--gold)" />
          <div><b>{t('Уровень')}</b><div className="small mute">{s.xp} XP</div></div>
        </div>
        <div className="card row" style={{ margin: 0 }}>
          <Ring pct={Math.min(1, s.streak.count / 7)} label={'🔥' + s.streak.count} color="var(--teal)" />
          <div><b>{t('Серия')}</b><div className="small mute">❄️ {t('заморозок: {n}', { n: s.streak.freezes })}</div></div>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>{t('Миссия дня')}</h2>
        {tasks.map((x) => (
          <Link key={x.k} className="node wide" data-acc={x.acc} data-done={m[x.k] ? '1' : '0'} style={m[x.k] ? { borderColor: 'var(--ok)' } : undefined} to={x.to}>
            <span className="ic">{m[x.k] ? '✅' : x.ic}</span>
            <span><b>{x.title}</b><br /><span className="small mute">{x.sub}</span></span>
          </Link>
        ))}
      </div>
      <div className="grid g2">
        <div className="card">
          <h3>🎯 {t('Твоя цель')}</h3>
          {p.goal.ielts > 0 && (
            <p>IELTS <b>{p.goal.ielts}</b> {est.band != null && <>· {t('сейчас')} ≈ <b>{est.band}</b></>}<br /><span className="small mute">{t('экзамен')}: {p.dates.ielts || '—'}</span></p>
          )}
          {p.goal.sat > 0 && (
            <p>SAT <b>{p.goal.sat}</b> {est.sat != null && <>· {t('сейчас')} ≈ <b>{est.sat}</b></>}<br /><span className="small mute">{t('экзамен')}: {p.dates.sat || '—'}</span></p>
          )}
          <p><b>{dl}</b> {t('дней до экзамена')} · {t('нужно')} ≈ <b>{plan}</b> {t('мин в день')}</p>
          {plan >= 90 && <p className="small mute">{t('Нагрузка высокая — если нереально, отодвинь дату или снизь цель (Профиль → Изменить цель).')}</p>}
          <Link className="btn alt sm" to="/dash">{t('Прогноз и график')}</Link>
        </div>
        <div className="card">
          <h3>{t('Быстрый доступ')}</h3>
          <Row>
            <Link className="btn alt sm" to="/vocab">📚 {t('Слова')}</Link>
            <Link className="btn alt sm" to="/reader">📖 {t('Читалка')}</Link>
            <Link className="btn alt sm" to="/writing">✍️ Writing</Link>
            <Link className="btn alt sm" to="/speaking">🎤 Speaking</Link>
            <Link className="btn alt sm" to="/shadow">🎧 {t('Диктант')}</Link>
            <Link className="btn alt sm" to="/journal">📓 {t('Ошибки')}</Link>
          </Row>
          {!s.diag && <p style={{ marginTop: '.8rem' }}><Link className="btn" to="/diag">🧭 {t('Пройти диагностику')}</Link></p>}
        </div>
      </div>
    </>
  );
}
