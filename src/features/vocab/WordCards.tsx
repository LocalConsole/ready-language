import { useState } from 'react';
import type { Word } from '@/types';
import { Morph } from '@/components/Morph';
import { speak } from '@/lib/fx';
import { mnemonic } from '@/lib/aiTasks';
import { Skel } from '@/components/ui';
import { t } from '@/i18n';

const POS: Record<string, string> = { n: 'существительное', v: 'глагол', adj: 'прилагательное', adv: 'наречие' };

/** Показ новых слов по одному: слово, озвучка, перевод, пример, подсказка для запоминания (ИИ или локальная). */
export function WordCards({ words, onDone }: { words: Word[]; onDone: () => void }) {
  const [k, setK] = useState(0);
  const [mn, setMn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const w = words[k];
  if (!w) return null;
  const last = k === words.length - 1;

  const hint = async () => {
    setLoading(true);
    const r = await mnemonic(w.w, w.tr);
    setMn(r ?? t('Образ: представь «{tr}» и проговори «{w}» вслух три раза — звук + картинка лучше запоминаются вместе.', { tr: w.tr, w: w.w }));
    setLoading(false);
  };
  const next = () => {
    if (last) return onDone();
    setK(k + 1);
    setMn(null);
  };
  return (
    <div className="wcard" data-acc="vocab" data-testid="word-card">
      <div className="wc-top">
        <b>{t('Новое слово {n} из {total}', { n: k + 1, total: words.length })}</b>
        <span className="dots" aria-hidden="true">{words.map((_, i) => <i key={i} className={`${i <= k ? 'on' : ''} ${i === k ? 'cur' : ''}`} />)}</span>
      </div>
      <div className="hint">🐻 <span>{t('Прочитай слово, нажми «Послушать», запомни перевод. Потом Миша проверит.')}</span></div>
      <div className="wc-word">
        <h2>{w.w}</h2>
        {w.pos && <span className="badge">{t(POS[w.pos] || w.pos)}</span>}
        <button className="btn alt" onClick={() => speak(w.w, { rate: 0.8 })}>🔊 {t('Послушать')}</button>
      </div>
      <div className="wc-sec tr"><label>{t('Перевод')}</label><div className="v">{w.tr}</div></div>
      {w.def && <div className="wc-sec"><label>{t('Значение по-английски')}</label><div className="v">{w.def}</div></div>}
      {w.ex && <div className="wc-sec ex"><label>{t('Пример')}</label><div className="v">{w.ex}</div></div>}
      <div className="small" style={{ margin: '.5rem 0' }}><Morph word={w.w} pos={w.pos} /></div>
      <div className="row" style={{ marginTop: '.8rem' }}>
        <button className="btn alt" onClick={hint} disabled={loading}>💡 {t('Подсказка для запоминания')}</button>
        <span className="sp" />
        <button className="btn big" data-testid="word-next" onClick={next}>{last ? t('Проверить себя') + ' →' : t('Дальше') + ' →'}</button>
      </div>
      <div className="small" style={{ marginTop: '.6rem' }} aria-live="polite">{loading ? <Skel /> : mn}</div>
    </div>
  );
}
