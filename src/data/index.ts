import { create } from 'zustand';
import type { Lang, Lesson, Module, Passage, Question, SourceItem, SpeakingPrompts, Word, WritingPrompt } from '@/types';
import wordsJson from './words.json';
import questionsJson from './questions.json';
import lessonsJson from './lessons.json';
import promptsJson from './prompts.json';
import sourcesJson from './sources.json';
import { loadUz, translateData, uzJson } from '@/i18n/uz';
import { useSettings } from '@/store/settings';

export interface Dataset {
  words: Word[];
  questions: Question[];
  qById: Record<string, Question>;
  /** Тексты Reading и Listening по id */
  passages: Record<string, Passage>;
  readingTexts: Passage[];
  listeningTexts: Passage[];
  modules: Module[];
  lessons: Lesson[];
  lessonById: Record<string, Lesson>;
  prompts: { writing: WritingPrompt[]; speaking: SpeakingPrompts };
  sources: SourceItem[];
}

interface Raw {
  words: Word[];
  questions: { questions: Question[]; passages: Passage[]; listening: Passage[] };
  lessons: { modules: Module[]; lessons: Lesson[] };
  prompts: { writing: WritingPrompt[]; speaking: SpeakingPrompts };
  sources: { items: SourceItem[] };
}

const raw: Raw = {
  words: wordsJson as Word[],
  questions: questionsJson as unknown as Raw['questions'],
  lessons: lessonsJson as unknown as Raw['lessons'],
  prompts: promptsJson as unknown as Raw['prompts'],
  sources: sourcesJson as unknown as Raw['sources'],
};

function build(r: Raw): Dataset {
  const qById: Record<string, Question> = {};
  r.questions.questions.forEach((q) => (qById[q.id] = q));
  const passages: Record<string, Passage> = {};
  [...r.questions.passages, ...r.questions.listening].forEach((p) => (passages[p.id] = p));
  const lessonById: Record<string, Lesson> = {};
  r.lessons.lessons.forEach((l) => (lessonById[l.id] = l));
  return {
    words: r.words,
    questions: r.questions.questions,
    qById,
    passages,
    readingTexts: r.questions.passages,
    listeningTexts: r.questions.listening,
    modules: r.lessons.modules,
    lessons: r.lessons.lessons,
    lessonById,
    prompts: r.prompts,
    sources: r.sources.items,
  };
}

export const baseDataset = build(raw);
let uzDataset: Dataset | null = null;

export async function datasetFor(lang: Lang): Promise<Dataset> {
  if (lang !== 'uz') return baseDataset;
  if (uzDataset) return uzDataset;
  await loadUz();
  const j = uzJson()!;
  const r: Raw = {
    words: raw.words.map((w) => (j.words[w.id] ? { ...w, tr: j.words[w.id] } : w)),
    questions: translateData(raw.questions),
    lessons: translateData(raw.lessons),
    prompts: raw.prompts,
    sources: translateData(raw.sources),
  };
  uzDataset = build(r);
  return uzDataset;
}

interface DataStore {
  D: Dataset;
  load: (lang: Lang) => Promise<void>;
}
export const useData = create<DataStore>((set) => ({
  D: baseDataset,
  load: async (lang) => set({ D: await datasetFor(lang) }),
}));
export const getD = () => useData.getState().D;

useSettings.subscribe((s, p) => {
  if (s.lang !== p.lang) void useData.getState().load(s.lang);
});
