import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '@/components/ui';
import { useSettings, type OwnProvider, type Theme } from '@/store/settings';
import { exportProgress, flushProgress, useProgress } from '@/store/progress';
import { toast } from '@/store/ui';
import { PROXY_URL, aiAvailable, pingAI, resetCooldown, useAIStatus } from '@/lib/ai';
import { today } from '@/lib/util';
import { t } from '@/i18n';
import type { Lang } from '@/types';

export default function Settings() {
  const nav = useNavigate();
  const st = useSettings();
  const importProgress = useProgress((s) => s.importProgress);
  const resetAll = useProgress((s) => s.resetAll);
  const used = useAIStatus((s) => s.usedToday);
  const lastErr = useAIStatus((s) => s.lastError);
  const [prov, setProv] = useState<OwnProvider>(st.ownKey.provider);
  const [key, setKey] = useState(st.ownKey.key);
  const [res, setRes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveKey = () => {
    st.patch({ ownKey: { provider: prov, key: key.trim() } });
    toast(t('Сохранено'));
  };
  const test = async () => {
    setBusy(true);
    setRes(null);
    resetCooldown(); // явная проверка пользователя — снимаем «паузу»
    try {
      const r = await pingAI();
      setRes('✅ ' + t('Работает через {p}', { p: r.provider }) + ': ' + r.text.slice(0, 40));
    } catch (e) {
      setRes('❌ ' + ((e as Error).message || t('ошибка')) + ' — ' + t('сайт продолжит работать на локальной базе.'));
    }
    setBusy(false);
  };
  const doExport = async () => {
    await flushProgress();
    const blob = new Blob([JSON.stringify(await exportProgress())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `misha-progress-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    try {
      if (f.size > 25 * 1024 * 1024) throw new Error('size');
      await importProgress(JSON.parse(await f.text()));
      toast(t('Прогресс загружен'));
      nav('/home');
    } catch {
      toast(t('Файл не подошёл'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const notify = async () => {
    if (!('Notification' in window)) return toast(t('Браузер не поддерживает уведомления'));
    const p = await Notification.requestPermission();
    if (p !== 'granted') return toast(t('Разрешение не выдано'));
    try {
      const reg = await navigator.serviceWorker.ready;
      const ps = (reg as unknown as { periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> } }).periodicSync;
      if (ps) await ps.register('misha-miss', { minInterval: 12 * 3600 * 1000 });
      await reg.showNotification(t('Миша'), { body: t('Я включил напоминания. Если пропадёшь на сутки — напомню.'), icon: './icons/icon-192.png' });
    } catch {
      toast(t('Уведомления включены, но фоновые доступны не везде'));
    }
  };

  const ok = aiAvailable();
  return (
    <>
      <PageHead icon="⚙️" title={t('Настройки')} sub={t('Тема, язык, ИИ, данные и доступность.')} acc="sat_math" />
      <div className="card">
        <div className="grid g2">
          <div>
            <label htmlFor="th">{t('Тема')}</label>
            <select id="th" value={st.theme} onChange={(e) => st.patch({ theme: e.target.value as Theme })}>
              <option value="auto">{t('Авто')}</option>
              <option value="light">{t('Светлая')}</option>
              <option value="dark">{t('Тёмная')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="lg">{t('Язык интерфейса')}</label>
            <select id="lg" value={st.lang} onChange={(e) => void st.setLang(e.target.value as Lang)}>
              <option value="ru">Русский</option>
              <option value="uz">O'zbekcha</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <label className="inline"><input type="checkbox" id="sn" checked={st.sound} onChange={(e) => st.patch({ sound: e.target.checked })} /> {t('Звуки')}</label>
        <label className="inline"><input type="checkbox" id="bg" checked={st.big} onChange={(e) => st.patch({ big: e.target.checked })} /> {t('Крупный шрифт')}</label>
        <label className="inline"><input type="checkbox" id="dy" checked={st.dys} onChange={(e) => st.patch({ dys: e.target.checked })} /> {t('Режим для дислексии')}</label>
        <label className="inline"><input type="checkbox" id="rd" checked={st.reduce} onChange={(e) => st.patch({ reduce: e.target.checked })} /> {t('Меньше анимации')}</label>
      </div>

      <div className="card">
        <h3>{t('ИИ')}</h3>
        <div className="expl small">
          {t('ИИ уже подключён через встроенный прокси — ключ вводить не нужно. Поле ниже — запасной вариант на случай, если прокси недоступен или его лимит исчерпан. Ключ хранится только на этом устройстве и не попадает в экспорт прогресса.')}
        </div>
        <p className="small"><b>{t('Статус')}:</b> {ok ? t('ИИ подключён') + ' ●' : t('ИИ отдыхает — работаю на локальной базе') + ' ○'} · {t('запросов сегодня: {n}', { n: used })}{lastErr ? ` · ${lastErr}` : ''}</p>
        <p className="small mute" style={{ wordBreak: 'break-all' }}>{t('Прокси')}: {PROXY_URL.replace(/\/macros\/s\/.+\//, '/macros/s/…/')}</p>
        <div className="grid g2">
          <div>
            <label htmlFor="prov">{t('Свой ключ: провайдер')}</label>
            <select id="prov" value={prov} onChange={(e) => setProv(e.target.value as OwnProvider)}>
              <option value="groq">Groq (console.groq.com)</option>
              <option value="gemini">Gemini (aistudio.google.com)</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div>
            <label htmlFor="okey">{t('Свой ключ (запасной вариант)')}</label>
            <input id="okey" type="password" value={key} autoComplete="off" onChange={(e) => setKey(e.target.value)} />
          </div>
        </div>
        <p className="small mute">⚠️ {t('Ключ, введённый в браузере, виден любому, кто получит доступ к этому устройству.')}</p>
        <div className="row">
          <button className="btn" id="ks" onClick={saveKey}>{t('Сохранить')}</button>
          <button className="btn alt" id="kt" disabled={busy} onClick={test}>{busy ? '…' : t('Проверить ИИ')}</button>
        </div>
        {res && <div className="small" id="kr" style={{ marginTop: '.5rem' }} role="status">{res}</div>}
      </div>

      <div className="card">
        <h3>{t('Данные')}</h3>
        <div className="row">
          <button className="btn alt" id="ex" onClick={doExport}>⬇ {t('Экспорт прогресса')}</button>
          <label className="btn alt" style={{ margin: 0 }}>⬆ {t('Импорт прогресса')}<input ref={fileRef} type="file" id="im" accept=".json,application/json" hidden onChange={(e) => void doImport(e.target.files?.[0])} /></label>
          <button className="btn alt" id="nt" onClick={notify}>🔔 {t('Уведомления «Миша скучает»')}</button>
          {!confirmReset ? (
            <button className="btn alt" id="rs" style={{ color: 'var(--bad)' }} onClick={() => setConfirmReset(true)}>{t('Сбросить всё')}</button>
          ) : (
            <span className="row" role="alert">
              <span className="small">{t('Удалить весь прогресс на этом устройстве? Это нельзя отменить.')}</span>
              <button className="btn" style={{ background: 'var(--bad)' }} id="rs-yes" onClick={async () => { await resetAll(); setConfirmReset(false); nav('/start'); }}>{t('Да, удалить')}</button>
              <button className="btn alt" onClick={() => setConfirmReset(false)}>{t('Отмена')}</button>
            </span>
          )}
        </div>
        <p className="small mute">{t('Прогресс хранится только на этом устройстве (IndexedDB), настройки — в localStorage. Регулярно делай экспорт.')}</p>
      </div>
    </>
  );
}
