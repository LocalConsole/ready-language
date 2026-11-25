import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Mood } from '@/components/Mascot';
import { PageHead } from '@/components/ui';
import { db } from '@/lib/db';
import { readEpub } from '@/lib/epub';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { toast } from '@/store/ui';
import { uid } from '@/lib/util';
import { t } from '@/i18n';

export default function ReaderLibrary() {
  const builtin = useData((s) => s.D?.readingTexts) || [];
  const user = useLiveQuery(() => db.texts.toArray(), [], []) || [];
  const pos = useProgress((s) => s.readPos);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    setTitle(f.name.replace(/\.[^.]+$/, ''));
    try {
      if (/\.pdf$/i.test(f.name)) return toast(t('PDF: вставь текст вручную'));
      if (/\.epub$/i.test(f.name)) setText(await readEpub(f));
      else {
        const raw = await f.text();
        setText(/\.html?$/i.test(f.name) ? new DOMParser().parseFromString(raw, 'text/html').body.textContent || '' : raw);
      }
    } catch {
      toast(t('Не удалось прочитать файл'));
    }
  };
  const add = async () => {
    const tx = text.trim();
    if (!tx) return;
    await db.texts.put({ id: 'u_' + uid(), title: title || t('Мой текст'), text: tx, src: t('добавлено пользователем') });
    setText(''); setTitle('');
    if (fileRef.current) fileRef.current.value = '';
    toast(t('Текст добавлен'));
  };
  const all = [...builtin.map((x) => ({ ...x, builtin: true })), ...user.map((x) => ({ ...x, builtin: false }))];
  return (
    <>
      <PageHead icon="📖" title={t('Читалка')} sub={t('Читай тексты и тапай по любому слову — перевод, определение и произношение сразу.')} acc="reading" />
      <div className="card"><Mood state="hello" text={t('Тапни любое слово — покажу перевод, определение, произношение.')} /></div>
      <div className="card">
        <h3>{t('Библиотека')}</h3>
        {all.map((x) => (
          <Link key={x.id} className="node wide" data-acc="reading" to={'/reader/' + x.id} data-testid="text-link">
            <span className="ic">{x.builtin ? '📘' : '📄'}</span>
            <span><b>{x.title}</b><br /><span className="small mute">{x.src || t('твой текст')} · {t('прочитано')} {Math.round((pos[x.id] || 0) * 100)}%</span></span>
          </Link>
        ))}
      </div>
      <div className="card">
        <h3>{t('Добавить свой текст')}</h3>
        <input type="text" aria-label={t('Название')} placeholder={t('Название')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea aria-label={t('Текст')} id="tx" placeholder={t('Вставь текст…')} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 120 }} />
        <div className="row" style={{ marginTop: '.5rem' }}>
          <input ref={fileRef} type="file" aria-label={t('Загрузить файл')} accept=".txt,.md,.html,.epub,.pdf" style={{ width: 'auto' }} onChange={(e) => onFile(e.target.files?.[0])} />
          <span className="sp" />
          <button className="btn" id="ta" onClick={add}>{t('Добавить')}</button>
        </div>
        <p className="small mute">{t('.txt, .md, .html и .epub читаются прямо в браузере. PDF без внешних библиотек не разобрать — скопируй текст и вставь. Файлы не покидают устройство.')}</p>
      </div>
    </>
  );
}
