import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import { Mascot, Mood } from './Mascot';
import { Toasts, ConfettiCanvas } from './Toasts';
import { ErrorBoundary } from './ErrorBoundary';
import { Skel } from './ui';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { aiAvailable, useAIStatus } from '@/lib/ai';
import { stopSpeak } from '@/lib/fx';
import { kvSet } from '@/lib/db';
import { t } from '@/i18n';

const NAV: [string, string, string][] = [
  ['home', '🏠', 'Главная'],
  ['path', '🗺️', 'Путь'],
  ['practice', '🎯', 'Практика'],
  ['exam', '📝', 'Экзамен'],
  ['dash', '📈', 'Прогресс'],
  ['me', '🐻', 'Профиль'],
];

function AIIndicator() {
  const cool = useAIStatus((s) => s.cooldownUntil);
  const used = useAIStatus((s) => s.usedToday);
  const own = useSettings((s) => s.ownKey.key);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  void cool; void own;
  const ok = online && aiAvailable();
  const title = !online ? t('ИИ: нет сети — работаю на локальной базе') : ok ? t('ИИ подключён · запросов сегодня: {n}', { n: used }) : t('ИИ отдыхает после ошибки — работаю на локальной базе');
  return (
    <NavLink to="/settings" className="chip ai-ind" title={title} aria-label={title} data-ok={ok ? '1' : '0'}>
      {t('ИИ')} {ok ? '●' : '○'}
    </NavLink>
  );
}

export function Layout() {
  const xp = useProgress((s) => s.xp);
  const lang = useSettings((s) => s.lang);
  const reduce = useSettings((s) => s.reduce);
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    stopSpeak();
    void kvSet('lastActive', Date.now());
  }, [loc.pathname]);
  useEffect(() => {
    document.title = t('Миша — IELTS & SAT от нуля до экзамена');
  }, [lang]);

  const skip = (e: React.MouseEvent) => {
    // с HashRouter href="#main" сломал бы маршрут, поэтому просто переносим фокус
    e.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
      <div key={lang} className="app">
        <a className="sr" href="#main" onClick={skip}>{t('Перейти к содержимому')}</a>
        <header id="top">
          <NavLink className="logo" to="/home" aria-label={t('Миша — главная')}>
            <Mascot state="hello" still style={{ width: 34, height: 34 }} />
            {t('Миша')}
          </NavLink>
          <span className="chip" title={t('Опыт')}>⭐ <span id="hdr-xp">{xp}</span></span>
          <AIIndicator />
          <nav aria-label={t('Основное')}>
            {NAV.map(([r, , l]) => <NavLink key={r} to={'/' + r} className={({ isActive }) => (isActive ? 'on' : '')}>{t(l)}</NavLink>)}
          </nav>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1}>
          <ErrorBoundary resetKey={loc.pathname}>
            <Suspense fallback={<div className="card"><Mood state="think" text={t('Миша ищет нужную страницу…')} /><Skel /><Skel w="60%" /></div>}>
              <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <Outlet />
              </motion.div>
            </Suspense>
          </ErrorBoundary>
        </main>
        <nav id="bottom" aria-label={t('Основное')}>
          {NAV.map(([r, i, l]) => (
            <NavLink key={r} to={'/' + r} className={({ isActive }) => (isActive ? 'on' : '')}><span aria-hidden="true">{i}</span>{t(l)}</NavLink>
          ))}
        </nav>
        <Toasts />
        <ConfettiCanvas />
      </div>
    </MotionConfig>
  );
}
