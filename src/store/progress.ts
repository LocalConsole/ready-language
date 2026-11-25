import { create } from 'zustand';
import type {
  Book, BookEntry, Card, Diag, ErrorEntry, ExamRecord, Homework, Profile, QResult, Question, ReviewSession, ReviewText,
  SkillStat, SpeakingRecord, Streak, UserText, Word, WritingRecord,
} from '@/types';
import { db, kvGet, kvSet } from '@/lib/db';
import { addDays, dayDiff, today, uid } from '@/lib/util';
import { gradeCard, newCard } from '@/lib/srs';
import { level } from '@/lib/plan';
import { ACH } from '@/lib/achievements';
import { confetti, playSound } from '@/lib/fx';
import { toast } from '@/store/ui';
import { t } from '@/i18n';

export interface ProgressState {
  v: 2;
  profile: Profile | null;
  xp: number;
  streak: Streak;
  daily: Record<string, { xp: number; min: number }>;
  lessons: Record<string, { score: number; date: string }>;
  cards: Record<string, Card>;
  errors: ErrorEntry[];
  customWords: Word[];
  books: Book[];
  homework: Homework[];
  exams: ExamRecord[];
  diag: Diag | null;
  mission: Record<string, Record<string, boolean>>;
  achievements: string[];
  bookmarks: Record<string, number[]>;
  readPos: Record<string, number>;
  writing: WritingRecord[];
  speaking: SpeakingRecord[];
  stats: Record<string, SkillStat>;
  lastReview: ReviewSession | null;
  created: number;
}

export const defaultProgress = (): ProgressState => ({
  v: 2, profile: null, xp: 0, streak: { count: 0, last: null, freezes: 1 }, daily: {}, lessons: {}, cards: {}, errors: [],
  customWords: [], books: [], homework: [], exams: [], diag: null, mission: {}, achievements: [], bookmarks: {}, readPos: {},
  writing: [], speaking: [], stats: {}, lastReview: null, created: Date.now(),
});

interface Actions {
  ready: boolean;
  setProfile: (p: Profile) => void;
  addXP: (n: number, minutes?: number) => void;
  unlock: (id: string) => void;
  missionDone: (k: string) => void;
  srsAdd: (id: string, kind?: Card['kind']) => boolean;
  srsGrade: (id: string, q: number, kind?: Card['kind']) => void;
  record: (results: QResult[]) => QResult[];
  finishSession: (results: QResult[], ctx?: { title?: string; extra?: ReviewText[] }) => { ok: number; total: number; errs: QResult[] };
  setReview: (r: ReviewSession | null) => void;
  setLesson: (id: string, score: number) => void;
  setDiag: (d: Diag) => void;
  addExam: (e: Omit<ExamRecord, 'id'>) => string;
  addWriting: (w: WritingRecord) => void;
  addSpeaking: (s: SpeakingRecord) => void;
  addCustomWord: (w: Word) => void;
  addBookWords: (bookId: string, title: string, entries: BookEntry[]) => void;
  addHomework: (h: Omit<Homework, 'id' | 'created' | 'done'>) => void;
  completeHomework: (id: string) => void;
  removeError: (id: string) => void;
  toggleJournal: (q: Question, ans: number | string | null) => boolean;
  setBookmark: (textId: string, para: number) => void;
  setReadPos: (id: string, p: number) => void;
  resetAll: () => Promise<void>;
  importProgress: (raw: unknown) => Promise<void>;
}

export const useProgress = create<ProgressState & Actions>((set, get) => {
  const touchDay = (s: ProgressState, minutes: number): Pick<ProgressState, 'daily' | 'streak'> => {
    const d = today();
    const rec = { ...(s.daily[d] ?? { xp: 0, min: 0 }) };
    rec.min += minutes;
    const streak = { ...s.streak };
    if (streak.last !== d) {
      const gap = streak.last ? dayDiff(streak.last, d) : 1;
      if (gap === 1) streak.count++;
      else if (gap > 1) {
        const miss = gap - 1;
        if (streak.freezes >= miss) {
          streak.freezes -= miss;
          streak.count++;
          toast(t('❄️ Заморозка серии спасла {n} дн.', { n: miss }));
        } else streak.count = 1;
      } else if (streak.count === 0) streak.count = 1;
      streak.last = d;
      if (streak.count > 0 && streak.count % 7 === 0) streak.freezes = Math.min(3, streak.freezes + 1);
    }
    return { daily: { ...s.daily, [d]: rec }, streak };
  };

  return {
    ...defaultProgress(),
    ready: false,
    setProfile: (profile) => set({ profile }),

    addXP: (n, minutes = 0) => {
      const s = get();
      const before = level(s.xp);
      const d = today();
      const td = touchDay(s, minutes);
      const rec = { ...td.daily[d], xp: (td.daily[d]?.xp || 0) + n };
      const xp = s.xp + n;
      set({ xp, daily: { ...td.daily, [d]: rec }, streak: td.streak });
      if (level(xp) > before) {
        toast(t('⭐ Уровень {n}! Миша получил обновку.', { n: level(xp) }));
        confetti(100);
        playSound('win');
      }
      const st = get();
      if (Object.keys(st.cards).length >= 50) st.unlock('words50');
      if (st.streak.count >= 3) st.unlock('streak3');
      if (st.streak.count >= 7) st.unlock('streak7');
      if (level(xp) >= 5) st.unlock('lvl5');
    },

    unlock: (id) => {
      if (get().achievements.includes(id) || !ACH[id]) return;
      set((s) => ({ achievements: [...s.achievements, id] }));
      toast(t('🏆 Достижение: {name}', { name: t(ACH[id][1]) }));
      confetti(80);
      playSound('win');
    },

    missionDone: (k) => {
      const d = today();
      set((s) => ({ mission: { ...s.mission, [d]: { ...(s.mission[d] || {}), [k]: true } } }));
    },

    srsAdd: (id, kind = 'word') => {
      if (get().cards[id]) return false;
      set((s) => ({ cards: { ...s.cards, [id]: newCard(id, kind) } }));
      return true;
    },
    srsGrade: (id, q, kind = 'word') => {
      set((s) => ({ cards: { ...s.cards, [id]: gradeCard(s.cards[id] || newCard(id, kind), q) } }));
    },

    record: (results) => {
      const s = get();
      const stats = { ...s.stats };
      const cards = { ...s.cards };
      let errors = [...s.errors];
      const errs: QResult[] = [];
      const d = today();
      for (const r of results) {
        const q = r.q;
        const st: SkillStat = { ...(stats[q.skill] ?? { n: 0, ok: 0, w: 0, wok: 0 }) };
        const w = [1, 1.5, 2][(q.lvl || 2) - 1] || 1;
        st.n++;
        st.w += w;
        if (r.ok) {
          st.ok++;
          st.wok += w;
        }
        stats[q.skill] = st;
        if (q.wid && cards[q.wid]) cards[q.wid] = gradeCard(cards[q.wid], r.ok ? 4 : 1);
        const ek = 'q:' + q.id;
        if (!r.ok) {
          errs.push(r);
          const snap = { ...q };
          const i = errors.findIndex((e) => e.qid === q.id);
          if (i >= 0) errors[i] = { ...errors[i], count: errors[i].count + 1, date: d, ans: r.ans, q: snap };
          else errors.push({ id: uid(), qid: q.id, q: snap, ans: r.ans, date: d, count: 1, topic: q.topic, skill: q.skill });
          cards[ek] = { ...(cards[ek] || newCard(ek, 'error')), due: addDays(d, 1) };
          if (q.wid && !cards[q.wid]) cards[q.wid] = newCard(q.wid, 'word');
        } else if (cards[ek]) cards[ek] = gradeCard(cards[ek], 4);
      }
      if (errors.length > 600) errors = errors.slice(-600);
      set({ stats, cards, errors });
      return errs;
    },

    finishSession: (results, ctx = {}) => {
      const errs = get().record(results);
      const ok = results.filter((r) => r.ok).length;
      if (ok === results.length && results.length >= 3) get().unlock('perfect');
      set({ lastReview: { title: ctx.title || 'Разбор', items: errs.map((r) => ({ kind: 'q' as const, q: r.q, ans: r.ans })), extra: ctx.extra || [] } });
      return { ok, total: results.length, errs };
    },
    setReview: (lastReview) => set({ lastReview }),

    setLesson: (id, score) => {
      const first = Object.keys(get().lessons).length === 0;
      set((s) => ({ lessons: { ...s.lessons, [id]: { score: Math.max(score, s.lessons[id]?.score || 0), date: today() } } }));
      if (first) get().unlock('first');
    },
    setDiag: (diag) => set({ diag }),
    addExam: (e) => {
      const id = uid();
      set((s) => ({ exams: [...s.exams, { ...e, id }] }));
      get().unlock('exam1');
      return id;
    },
    addWriting: (w) => set((s) => ({ writing: [...s.writing, w].slice(-100) })),
    addSpeaking: (sp) => set((s) => ({ speaking: [...s.speaking, sp].slice(-100) })),
    addCustomWord: (w) => set((s) => (s.customWords.some((x) => x.id === w.id) ? s : { customWords: [...s.customWords, w] })),
    addBookWords: (bookId, title, entries) =>
      set((s) => {
        const books = s.books.map((b) => ({ ...b, entries: [...b.entries] }));
        let b = books.find((x) => x.id === bookId);
        if (!b) {
          b = { id: bookId, title, entries: [] };
          books.push(b);
        }
        for (const e of entries) {
          const ex = b.entries.findIndex((x) => x.w.toLowerCase() === e.w.toLowerCase());
          if (ex >= 0) b.entries[ex] = { ...e, id: b.entries[ex].id };
          else b.entries.push(e);
        }
        return { books };
      }),
    addHomework: (h) => set((s) => ({ homework: [...s.homework, { ...h, id: uid(), created: today(), done: false }] })),
    completeHomework: (id) => set((s) => ({ homework: s.homework.map((h) => (h.id === id ? { ...h, done: true } : h)) })),
    removeError: (id) => set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),
    toggleJournal: (q, ans) => {
      const has = get().errors.some((e) => e.qid === q.id);
      if (has) set((s) => ({ errors: s.errors.filter((e) => e.qid !== q.id) }));
      else set((s) => ({ errors: [...s.errors, { id: uid(), qid: q.id, q: { ...q }, ans, date: today(), count: 1, topic: q.topic, skill: q.skill }] }));
      return !has;
    },
    setBookmark: (textId, para) =>
      set((s) => {
        const L = [...(s.bookmarks[textId] || [])];
        const i = L.indexOf(para);
        if (i >= 0) L.splice(i, 1);
        else L.push(para);
        return { bookmarks: { ...s.bookmarks, [textId]: L } };
      }),
    setReadPos: (id, p) => set((s) => (p > (s.readPos[id] || 0) ? { readPos: { ...s.readPos, [id]: p } } : s)),

    resetAll: async () => {
      set({ ...defaultProgress() });
      await Promise.all([db.kv.clear(), db.texts.clear(), db.aiCache.clear()]);
      await kvSet('progress', pickState(get()));
    },

    importProgress: async (raw) => {
      const { progress, texts } = parseImport(raw);
      set({ ...progress });
      await db.texts.clear();
      if (texts.length) await db.texts.bulkPut(texts);
      await kvSet('progress', pickState(get()));
    },
  };
});

/* ---------- нормализация и импорт/экспорт ---------- */
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const arr = <T,>(x: unknown, f: (v: Record<string, unknown>) => boolean = () => true): T[] =>
  (Array.isArray(x) ? x.filter((v) => isObj(v) && f(v)) : []) as T[];
const num = (x: unknown, d = 0) => (typeof x === 'number' && isFinite(x) ? x : d);

/** Приводит произвольный объект (старый формат или файл импорта) к безопасной структуре ProgressState. */
export function normalize(raw: unknown): ProgressState {
  const d = defaultProgress();
  if (!isObj(raw)) return d;
  const r = raw;
  const prof = isObj(r.profile) && isObj(r.profile.goal) ? (r.profile as unknown as Profile) : null;
  return {
    ...d,
    profile: prof
      ? { goal: { ielts: num(prof.goal.ielts), sat: num(prof.goal.sat) }, dates: { ielts: (prof.dates?.ielts as string) || null, sat: (prof.dates?.sat as string) || null }, created: String(prof.created || today()) }
      : null,
    xp: Math.max(0, num(r.xp)),
    streak: isObj(r.streak) ? { count: num(r.streak.count), last: typeof r.streak.last === 'string' ? r.streak.last : null, freezes: num(r.streak.freezes, 1) } : d.streak,
    daily: isObj(r.daily) ? (r.daily as ProgressState['daily']) : {},
    lessons: isObj(r.lessons) ? (r.lessons as ProgressState['lessons']) : {},
    cards: isObj(r.cards) ? (r.cards as ProgressState['cards']) : {},
    errors: arr<ErrorEntry>(r.errors, (e) => isObj(e.q) && typeof e.qid === 'string').slice(-600),
    customWords: arr<Word>(r.customWords, (w) => typeof w.w === 'string' && typeof w.id === 'string'),
    books: arr<Book>(r.books, (b) => Array.isArray(b.entries)),
    homework: arr<Homework>(r.homework),
    exams: arr<ExamRecord>(r.exams),
    diag: isObj(r.diag) ? (r.diag as unknown as Diag) : null,
    mission: isObj(r.mission) ? (r.mission as ProgressState['mission']) : {},
    achievements: Array.isArray(r.achievements) ? r.achievements.filter((x): x is string => typeof x === 'string' && x in ACH) : [],
    bookmarks: isObj(r.bookmarks) ? (r.bookmarks as ProgressState['bookmarks']) : {},
    readPos: isObj(r.readPos) ? (r.readPos as ProgressState['readPos']) : {},
    writing: arr<WritingRecord>(r.writing),
    speaking: arr<SpeakingRecord>(r.speaking),
    stats: isObj(r.stats) ? (r.stats as ProgressState['stats']) : {},
    lastReview: isObj(r.lastReview) ? (r.lastReview as unknown as ReviewSession) : null,
    created: num(r.created, Date.now()),
  };
}

function parseImport(raw: unknown): { progress: ProgressState; texts: UserText[] } {
  if (!isObj(raw) || raw.app !== 'misha') throw new Error('bad file');
  const legacy = isObj(raw.state); // версия 1: { app, at, state }
  const src = legacy ? (raw.state as Record<string, unknown>) : raw.progress;
  if (!isObj(src)) throw new Error('bad file');
  const textsRaw = legacy ? src.texts : raw.texts;
  const texts = arr<UserText>(textsRaw, (x) => typeof x.id === 'string' && typeof x.text === 'string').map((x) => ({
    id: String(x.id), title: String(x.title || 'Text'), text: String(x.text), src: String(x.src || ''),
  }));
  return { progress: normalize(src), texts };
}

const KEYS = Object.keys(defaultProgress()) as (keyof ProgressState)[];
export const pickState = (s: ProgressState): ProgressState => Object.fromEntries(KEYS.map((k) => [k, s[k]])) as unknown as ProgressState;

/** Экспорт НЕ содержит настроек и ключей — только учебные данные. */
export async function exportProgress() {
  const texts = await db.texts.toArray();
  return { app: 'misha', version: 2, at: new Date().toISOString(), progress: pickState(useProgress.getState()), texts };
}

/* ---------- загрузка и сохранение в IndexedDB ---------- */
let timer: ReturnType<typeof setTimeout> | undefined;
let dirty = false;
const flush = async () => {
  clearTimeout(timer);
  if (!dirty || !useProgress.getState().ready) return;
  dirty = false;
  await kvSet('progress', pickState(useProgress.getState()));
};
export const flushProgress = flush;

export async function initProgress() {
  let loaded: ProgressState | null = null;
  const saved = await kvGet<unknown>('progress');
  if (saved) loaded = normalize(saved);
  else {
    // миграция с прежней версии сайта (прогресс лежал в localStorage['misha.state'])
    try {
      const old = localStorage.getItem('misha.state');
      if (old) {
        const j = JSON.parse(old);
        loaded = normalize(j);
        if (Array.isArray(j.texts) && j.texts.length) {
          await db.texts.bulkPut(arr<UserText>(j.texts, (x) => typeof x.id === 'string' && typeof x.text === 'string'));
        }
        if (await kvSet('progress', pickState(loaded))) {
          localStorage.setItem('misha.state.migrated', old);
          localStorage.removeItem('misha.state');
        }
      }
    } catch (e) {
      console.warn('[progress] migration failed', e);
    }
  }
  useProgress.setState({ ...(loaded || defaultProgress()), ready: true });
  useProgress.subscribe((s, prev) => {
    if (!s.ready) return;
    for (const k of KEYS) {
      if (s[k] !== prev[k]) {
        dirty = true;
        clearTimeout(timer);
        timer = setTimeout(flush, 400);
        return;
      }
    }
  });
  addEventListener('pagehide', () => void flush());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flush());
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* не критично */
  }
}
