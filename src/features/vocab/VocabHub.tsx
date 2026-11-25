import { Link } from 'react-router-dom';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { useAllWords } from '@/lib/hooks';
import { dueCards } from '@/lib/srs';
import { t } from '@/i18n';

const TILES: [string, string, string][] = [
  ['🃏', 'Повторить (SRS)', '/vocab/review/any'],
  ['🌱', '5 новых слов', '/vocab/new'],
  ['✅', 'Выбор ответа', '/vocab/mode/choice'],
  ['⌨️', 'Ввод по определению', '/vocab/mode/type'],
  ['🔊', 'Аудио-диктовка', '/vocab/mode/dict'],
  ['🔍', 'Найди ошибку в написании', '/vocab/mode/spell'],
  ['📖', 'Список и темы', '/vocab/list'],
  ['📕', 'Книги и домашки', '/books'],
];

export default function VocabHub() {
  const cards = useProgress((s) => s.cards);
  const words = useAllWords();
  const due = dueCards(cards, 'word').length;
  const inS = Object.values(cards).filter((c) => c.kind === 'word').length;
  const mast = Object.values(cards).filter((c) => c.kind === 'word' && c.reps >= 4).length;
  return (
    <>
      <PageHead icon="📚" title={t('Слова')} sub={t('Карточки, тесты, диктовка и списки. Всё, что учишь, попадает в умные повторения (SRS).')} acc="vocab" />
      <div className="card">
        <Mood state="hello" text={due ? t('К повторению {n} слов. Давай по чуть-чуть.', { n: due }) : t('На сегодня повторений нет — можно взять новые слова.')} />
        <div className="row">
          <span className="chip">{t('Всего')}: {words.length}</span>
          <span className="chip">{t('В SRS')}: {inS}</span>
          <span className="chip">{t('Выучено')}: {mast}</span>
          <span className="chip" data-testid="due-count">{t('К повторению')}: {due}</span>
        </div>
      </div>
      <div className="grid g3">
        {TILES.map(([ic, n, to]) => (
          <Link key={to} className="card node" data-acc="vocab" style={{ width: 'auto', margin: 0 }} to={to}>
            <span className="ic">{ic}</span><b>{t(n)}</b>
          </Link>
        ))}
      </div>
    </>
  );
}
