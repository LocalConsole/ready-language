import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { t } from '@/i18n';

export default function WritingList() {
  const P = useData((s) => s.D?.prompts.writing) || [];
  const hist = useProgress((s) => s.writing).slice(-5).reverse();
  return (
    <>
      <PageHead icon="✍️" title="Writing" sub={t('Эссе и описание графиков с таймером и счётчиком слов. Проверка — по критериям экзамена.')} acc="writing" />
      <div className="card"><Mood state="board" text={t('Выбери задание. Таймер, счётчик слов и проверка по критериям — всё здесь.')} /></div>
      <div className="grid g2">
        {P.map((p) => (
          <Link key={p.id} className="card node" data-acc="writing" style={{ width: 'auto', margin: 0 }} to={'/write/' + p.id} data-testid="wtask">
            <span className="ic">✍️</span>
            <span><b>{p.kind} · {p.title}</b><br /><span className="small mute">{p.min} {t('мин')} · {t('от')} {p.minWords} {t('слов')} · {p.exam}</span></span>
          </Link>
        ))}
      </div>
      {hist.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}><h3>{t('Последние работы')}</h3>
          {hist.map((h, i) => <div className="row" key={i}><span>{h.date}</span><b>{h.title}</b><span className="sp" /><span className="chip">{h.overall}</span></div>)}</div>
      )}
    </>
  );
}
