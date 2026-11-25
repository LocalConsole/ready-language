import { Link } from 'react-router-dom';
import { PageHead } from '@/components/ui';
import { t } from '@/i18n';

const TILES: [string, string, string, string, string][] = [
  ['📚', 'Слова и SRS', '/vocab', 'vocab', 'карточки и повторения'],
  ['📖', 'Читалка', '/reader', 'reading', 'тап по слову'],
  ['📕', 'Книги и домашки', '/books', 'vocab', 'слова по страницам'],
  ['✍️', 'Writing', '/writing', 'writing', 'эссе с таймером'],
  ['🎤', 'Speaking', '/speaking', 'speaking', 'голосом, Part 1–3'],
  ['🎧', 'Shadowing и диктанты', '/shadow', 'listening', 'слушай и пиши'],
  ['🔍', 'Spelling', '/vocab/mode/spell', 'vocab', 'найди ошибку'],
  ['📓', 'Журнал ошибок', '/journal', 'danger', 'работа над ошибками'],
  ['⚡', 'Быстрый тест', '/quick', 'grammar', '5 вопросов'],
];
export default function Practice() {
  return (
    <>
      <PageHead icon="🎯" title={t('Практика')} sub={t('Выбери, что потренировать прямо сейчас.')} acc="grammar" />
      <div className="grid g3">
        {TILES.map(([i, n, to, ac, sub]) => (
          <Link key={to} className="card node" data-acc={ac} style={{ width: 'auto', margin: 0 }} to={to}>
            <span className="ic">{i}</span>
            <span><b>{t(n)}</b><br /><span className="small mute">{t(sub)}</span></span>
          </Link>
        ))}
      </div>
    </>
  );
}
