import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Morph } from '@/components/Morph';
import { useProgress } from '@/store/progress';
import { useAllWords } from '@/lib/hooks';
import { mastery } from '@/lib/srs';
import { toast } from '@/store/ui';
import { t } from '@/i18n';

export default function WordList() {
  const words = useAllWords();
  const cards = useProgress((s) => s.cards);
  const srsAdd = useProgress((s) => s.srsAdd);
  const [topic, setTopic] = useState('all');
  const [q, setQ] = useState('');
  const topics = [...new Set(words.map((w) => w.topic || ''))];
  const L = words.filter((w) => (topic === 'all' || w.topic === topic) && (!q || (w.w + w.tr).toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="row"><Link className="btn alt sm" to="/vocab">←</Link><h2 className="sp" style={{ margin: 0 }}>{t('Список слов')} ({L.length})</h2></div>
      <div className="row" style={{ margin: '.6rem 0' }}>
        <input type="text" aria-label={t('Поиск…')} placeholder={t('Поиск…')} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
        <select aria-label={t('Тема')} value={topic} onChange={(e) => setTopic(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">{t('Все темы')}</option>
          {topics.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <table className="tbl"><tbody>
        {L.slice(0, 150).map((w) => (
          <tr key={w.id}>
            <td><b>{w.w}</b> <span className="small mute">{w.pos}</span><div className="small"><Morph word={w.w} pos={w.pos} /></div></td>
            <td>{w.tr}</td>
            <td aria-label={t('Уровень освоения')}>{['⚪', '🟡', '🟢'][mastery(cards[w.id])]}</td>
            <td><button className="btn alt sm" disabled={!!cards[w.id]} aria-label={t('Добавить в SRS')} onClick={() => { srsAdd(w.id); toast(t('Добавлено в SRS')); }}>+</button></td>
          </tr>
        ))}
      </tbody></table>
    </>
  );
}
