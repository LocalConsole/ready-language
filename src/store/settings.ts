import { create } from 'zustand';
import type { Lang } from '@/types';
import { applyLang } from '@/i18n';
import { loadUz } from '@/i18n/uz';

export type Theme = 'auto' | 'light' | 'dark';
export type OwnProvider = 'groq' | 'gemini' | 'openrouter';
export interface Settings {
  theme: Theme;
  lang: Lang;
  sound: boolean;
  big: boolean;
  dys: boolean;
  reduce: boolean;
  /** Запасной вариант: собственный ключ, если прокси недоступен. Хранится только в localStorage этого устройства. */
  ownKey: { provider: OwnProvider; key: string };
}
const KEY = 'misha.settings';
const DEFAULTS: Settings = { theme: 'auto', lang: 'ru', sound: true, big: false, dys: false, reduce: false, ownKey: { provider: 'groq', key: '' } };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      return { ...DEFAULTS, ...j, ownKey: { ...DEFAULTS.ownKey, ...(j.ownKey || {}) } };
    }
    // миграция со старой версии сайта: настройки лежали внутри misha.state
    const old = localStorage.getItem('misha.state');
    if (old) {
      const s = JSON.parse(old).settings || {};
      const k = s.keys || {};
      const prov: OwnProvider | null = k.groq ? 'groq' : k.gemini ? 'gemini' : k.openrouter ? 'openrouter' : null;
      return {
        ...DEFAULTS,
        theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'auto',
        lang: s.lang === 'en' || s.lang === 'uz' ? s.lang : 'ru',
        sound: s.sound !== false,
        big: !!s.big,
        dys: !!s.dys,
        reduce: !!s.reduce,
        ownKey: prov ? { provider: prov, key: k[prov] } : DEFAULTS.ownKey,
      };
    }
  } catch {
    /* повреждённые настройки — берём значения по умолчанию */
  }
  return { ...DEFAULTS };
}

interface Store extends Settings {
  patch: (p: Partial<Omit<Settings, 'lang'>>) => void;
  setLang: (l: Lang) => Promise<void>;
}

const persist = (s: Settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ theme: s.theme, lang: s.lang, sound: s.sound, big: s.big, dys: s.dys, reduce: s.reduce, ownKey: s.ownKey }));
  } catch {
    /* хранилище недоступно (приватный режим) — настройки живут до перезагрузки */
  }
};

export const useSettings = create<Store>((set, get) => ({
  ...load(),
  patch: (p) => {
    set(p);
    persist(get());
    applyDom(get());
  },
  setLang: async (l) => {
    if (l === 'uz') await loadUz();
    applyLang(l);
    set({ lang: l });
    persist(get());
    applyDom(get());
  },
}));

export function applyDom(s: Settings) {
  const dark = s.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : s.theme === 'dark';
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.lang = s.lang;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? '#15171c' : '#c0392b');
  document.body.classList.toggle('bigtext', s.big);
  document.body.classList.toggle('dys', s.dys);
  document.body.classList.toggle('reduce', s.reduce);
  const weak =
    (navigator as unknown as { deviceMemory?: number }).deviceMemory! <= 2 ||
    navigator.hardwareConcurrency <= 2 ||
    !!(navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection?.saveData;
  document.body.classList.toggle('lite', weak);
}

/** Вызывается один раз до первого рендера. */
export async function initSettings() {
  const s = useSettings.getState();
  if (s.lang === 'uz') await loadUz();
  applyLang(s.lang);
  applyDom(s);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyDom(useSettings.getState()));
  document.title = s.lang === 'en' ? 'Misha — IELTS & SAT from zero to exam' : document.title;
}
