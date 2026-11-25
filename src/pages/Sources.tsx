import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { t } from '@/i18n';

const LAB: Record<string, string> = { own: '🟢 Своё (оригинальное)', open: '🔵 Открытое (только ссылки)', ai: '🟣 Сгенерировано ИИ', user: '🟡 Добавлено пользователем' };

export default function Sources() {
  const D = useData((s) => s.D);
  const books = useProgress((s) => s.books.length);
  const custom = useProgress((s) => s.customWords.length);
  return (
    <>
      <PageHead icon="📜" title={t('Откуда материалы')} sub={t('Что своё, что открытое, что добавил ты.')} acc="sat" />
      <div className="card"><Mood state="explain" text={t('Честно: платные учебники и закрытые экзамены я не копирую. Всё встроенное — оригинальное, открытое только по ссылке, а остальное добавляешь ты.')} /></div>
      {(['own', 'open', 'ai', 'user'] as const).map((c) => (
        <div className="card" key={c}>
          <h3>{t(LAB[c])}</h3>
          {D.sources.filter((x) => x.cat === c).map((x, i) => (
            <div key={i} style={{ margin: '.5rem 0' }}>
              <b>{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer">{x.title} ↗</a> : x.title}</b>
              <div className="small mute">{t('Лицензия/статус')}: {x.license} · {x.year}</div>
            </div>
          ))}
          {c === 'user' && <p className="small">{t('Твоих книг: {b}, слов: {w}.', { b: books, w: custom })}</p>}
          {c === 'own' && <p className="small">{t('Встроено заданий: {q}, слов: {w}. Все помечены источником прямо в «Разборе ошибок».', { q: D.questions.length, w: D.words.length })}</p>}
        </div>
      ))}
    </>
  );
}
