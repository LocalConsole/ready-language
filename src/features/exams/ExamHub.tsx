import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { t } from '@/i18n';

export default function ExamHub() {
  const last = useProgress((s) => s.exams).slice(-3).reverse();
  return (
    <>
      <PageHead icon="📝" title={t('Пробные экзамены')} sub={t('Проверь уровень в формате настоящего теста: таймеры, без подсказок.')} acc="ielts" />
      <div className="card"><Mood state="board" text={t('Еженедельный пробник — главный индикатор прогресса. Тайминги Writing и Speaking — настоящие. Reading/Listening сокращены под встроенный банк заданий (честно!).')} /></div>
      <div className="grid g2">
        <div className="card top" data-acc="ielts"><h3>🎓 IELTS</h3>
          <p className="small mute">Reading 20′ · Listening ~8′ · Writing 20′+40′ · Speaking ~14′</p>
          <div className="row"><Link className="btn" data-testid="ielts-full" to="/exam/ielts/full">{t('Полный пробник')}</Link>
            <Link className="btn alt sm" data-testid="ielts-reading" to="/exam/ielts/reading">Reading</Link>
            <Link className="btn alt sm" to="/exam/ielts/listening">Listening</Link>
            <Link className="btn alt sm" to="/write/t2">Writing</Link><Link className="btn alt sm" to="/speaking">Speaking</Link></div></div>
        <div className="card top" data-acc="sat"><h3>📐 Digital SAT</h3>
          <p className="small mute">{t('Адаптивные модули: R&W 1→2 и Math 1→2, калькулятор встроен')}</p>
          <div className="row"><Link className="btn" data-testid="sat-full" to="/exam/sat/full">{t('Полный пробник')}</Link>
            <Link className="btn alt sm" data-testid="sat-rw" to="/exam/sat/rw">R&amp;W</Link>
            <Link className="btn alt sm" data-testid="sat-math" to="/exam/sat/math">Math</Link></div></div>
      </div>
      {last.length > 0 && (
        <div className="card"><h3>{t('Недавние')}</h3>
          {last.map((e) => <Link key={e.id} className="row" to={'/report/' + e.id} style={{ textDecoration: 'none', color: 'inherit', padding: '.3rem 0' }}><span>{e.date}</span><b>{e.type.toUpperCase()}</b><span className="sp" /><span className="chip">{e.band ?? e.sat}</span></Link>)}</div>
      )}
    </>
  );
}
