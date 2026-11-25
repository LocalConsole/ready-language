import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initSettings, useSettings } from '@/store/settings';
import { initProgress } from '@/store/progress';
import { useData } from '@/data';
import './styles/global.css';

async function boot() {
  await initSettings();
  await initProgress();
  await useData.getState().load(useSettings.getState().lang);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // PWA: офлайн-режим; новая версия подхватывается автоматически (autoUpdate)
  registerSW({ immediate: true });
}
void boot();
