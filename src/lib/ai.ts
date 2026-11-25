/**
 * Единственная точка входа для ИИ. Все вызовы идут через прокси (Google Apps Script):
 *   POST, Content-Type: text/plain, тело {"prompt","system","long"}  →  {"text","provider"} | {"error"}
 * Ключи API в коде нет. Запасной вариант — собственный ключ пользователя (Настройки), хранится только в localStorage.
 *  - ответы кэшируются в IndexedDB по SHA-256(system + prompt);
 *  - при ошибке прокси включается «пауза» (cooldown) — повторных запросов сразу не будет, UI показывает локальный вариант;
 *  - одинаковые запросы, летящие одновременно, объединяются в один.
 */
import { create } from 'zustand';
import { db, trimAICache } from './db';
import { hash, today } from './util';
import { getLang } from '@/i18n';
import { useSettings } from '@/store/settings';

export const PROXY_URL: string =
  (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbxgC_2zj5-rVRmzXTVDkKkExT3pRG4YbVRhL5JPs6ALQkrS_pUDbwMTPgN2m50eMUO51w/exec';

export type AIErrorCode = 'offline' | 'cooldown' | 'proxy' | 'http' | 'timeout' | 'network' | 'parse' | 'empty';
export class AIError extends Error {
  code: AIErrorCode;
  status?: number;
  constructor(code: AIErrorCode, message?: string, status?: number) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

export interface AskOptions {
  prompt: string;
  system?: string;
  /** true — только для проверки Writing/Speaking и длинных разборов ошибок */
  long?: boolean;
  noCache?: boolean;
}
export interface AskResult {
  text: string;
  provider: string;
  cached: boolean;
}

interface AIStatusState {
  cooldownUntil: number;
  lastError: string;
  lastProvider: string;
  usedToday: number;
  bump: () => void;
}
const USAGE_KEY = 'misha.ai.usage';
const readUsage = (): number => {
  try {
    const j = JSON.parse(localStorage.getItem(USAGE_KEY) || 'null');
    return j && j.d === today() ? j.n : 0;
  } catch {
    return 0;
  }
};
export const useAIStatus = create<AIStatusState>((set, get) => ({
  cooldownUntil: 0,
  lastError: '',
  lastProvider: '',
  usedToday: readUsage(),
  bump: () => {
    const n = get().usedToday + 1;
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify({ d: today(), n }));
    } catch {
      /* не критично */
    }
    set({ usedToday: n });
  },
}));

const COOLDOWN_MS = 2 * 60_000;
const COOLDOWN_QUOTA_MS = 10 * 60_000;

export const DEFAULT_SYSTEM = 'You are Misha, a friendly bear teaching English for IELTS and SAT. Answer concisely.';

const LANG_NAME = { ru: 'Russian', en: 'English', uz: "Uzbek (Latin script, o'zbek tili)" } as const;
/** Язык ответов ИИ следует за языком интерфейса. */
export const langRule = () =>
  ` Write every explanation, comment, translation and hint in ${LANG_NAME[getLang()]}. Keep English examples and quotes in English.`;

async function sha(s: string): Promise<string> {
  try {
    if (crypto?.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* http без secure context */
  }
  return 'h' + hash(s);
}

/** Может ли ИИ ответить прямо сейчас (онлайн, нет паузы или есть свой ключ). */
export function aiAvailable(): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  return Date.now() >= useAIStatus.getState().cooldownUntil || !!useSettings.getState().ownKey.key.trim();
}

async function callProxy(prompt: string, system: string, long: boolean): Promise<{ text: string; provider: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), long ? 90_000 : 40_000);
  try {
    const r = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ prompt, system, long }),
      signal: ctl.signal,
    });
    if (!r.ok) throw new AIError('http', 'HTTP ' + r.status, r.status);
    const j = (await r.json().catch(() => null)) as { text?: string; provider?: string; error?: string } | null;
    if (!j) throw new AIError('parse', 'bad json');
    if (j.error || !j.text) throw new AIError('proxy', String(j.error || 'empty'));
    return { text: j.text, provider: j.provider || 'proxy' };
  } catch (e) {
    if (e instanceof AIError) throw e;
    if ((e as Error).name === 'AbortError') throw new AIError('timeout', 'timeout');
    throw new AIError('network', (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

/** Запасной путь: собственный ключ пользователя напрямую у провайдера. */
async function callOwnKey(prompt: string, system: string): Promise<{ text: string; provider: string }> {
  const { provider, key } = useSettings.getState().ownKey;
  const k = key.trim();
  if (!k) throw new AIError('empty', 'no key');
  const messages = [{ role: 'system', content: system }, { role: 'user', content: prompt }];
  const fin = async (r: Response, pick: (j: any) => string) => {
    if (!r.ok) throw new AIError('http', 'HTTP ' + r.status, r.status);
    const text = pick(await r.json());
    if (!text) throw new AIError('empty');
    return { text, provider };
  };
  if (provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(k)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
    });
    return fin(r, (j) => j.candidates?.[0]?.content?.parts?.[0]?.text);
  }
  const url = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
  const model = provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct:free' : 'llama-3.3-70b-versatile';
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k }, body: JSON.stringify({ model, messages, temperature: 0.3 }) });
  return fin(r, (j) => j.choices?.[0]?.message?.content);
}

const inflight = new Map<string, Promise<AskResult>>();

export async function ask(o: AskOptions): Promise<AskResult> {
  const system = (o.system ?? DEFAULT_SYSTEM) + langRule();
  const key = await sha(system + '\u0000' + o.prompt);
  if (!o.noCache) {
    try {
      const hit = await db.aiCache.get(key);
      if (hit) return { text: hit.text, provider: hit.provider, cached: true };
    } catch {
      /* кэш недоступен — идём в сеть */
    }
  }
  const running = inflight.get(key);
  if (running) return running;
  const p = (async (): Promise<AskResult> => {
    if (!navigator.onLine) throw new AIError('offline');
    const st = useAIStatus.getState();
    const hasOwn = !!useSettings.getState().ownKey.key.trim();
    let lastErr: unknown = null;
    if (Date.now() >= st.cooldownUntil) {
      try {
        const r = await callProxy(o.prompt, system, !!o.long);
        useAIStatus.setState({ lastError: '', lastProvider: r.provider });
        st.bump();
        return await save(key, r);
      } catch (e) {
        lastErr = e;
        const quota = e instanceof AIError && (e.status === 429 || /quota|limit|rate/i.test(e.message));
        useAIStatus.setState({ cooldownUntil: Date.now() + (quota ? COOLDOWN_QUOTA_MS : COOLDOWN_MS), lastError: (e as Error).message });
      }
    } else if (!hasOwn) {
      throw new AIError('cooldown', useAIStatus.getState().lastError || 'cooldown');
    }
    if (hasOwn) {
      try {
        const r = await callOwnKey(o.prompt, system);
        useAIStatus.setState({ lastProvider: r.provider });
        st.bump();
        return await save(key, r);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof AIError ? lastErr : new AIError('network', (lastErr as Error)?.message);
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

async function save(key: string, r: { text: string; provider: string }): Promise<AskResult> {
  try {
    await db.aiCache.put({ key, text: r.text, provider: r.provider, ts: Date.now() });
    if (Math.random() < 0.05) void trimAICache();
  } catch {
    /* не критично */
  }
  return { text: r.text, provider: r.provider, cached: false };
}

/** Запрос, ожидающий JSON. Бросает AIError('parse'), если ответ не разобрать. */
export async function askJSON<T = unknown>(o: AskOptions): Promise<{ data: T; provider: string; cached: boolean }> {
  const r = await ask({ ...o, prompt: o.prompt + '\n\nReturn ONLY valid JSON, no markdown, no commentary.' });
  const txt = r.text.trim().replace(/^```(?:json)?|```$/g, '').trim();
  try {
    return { data: JSON.parse(txt) as T, provider: r.provider, cached: r.cached };
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return { data: JSON.parse(m[0]) as T, provider: r.provider, cached: r.cached };
      } catch {
        /* упадём ниже */
      }
    }
    throw new AIError('parse', 'bad json from AI');
  }
}

/** Проверка связи для Настроек: обход кэша, короткий запрос. */
export async function pingAI() {
  return ask({ prompt: 'Say "ok" in one word.', noCache: true });
}
export function resetCooldown() {
  useAIStatus.setState({ cooldownUntil: 0, lastError: '' });
}
