export type Lang = 'ru' | 'en' | 'uz';
export type Skill = 'vocab' | 'grammar' | 'reading' | 'listening' | 'rw' | 'math';
export type ExamKind = 'ielts' | 'sat';
export type MishaState = 'hello' | 'think' | 'happy' | 'sad' | 'cheer' | 'board' | 'celebrate' | 'explain';

export interface Word {
  id: string;
  w: string;
  pos?: string;
  tr: string;
  def?: string;
  ex?: string;
  topic?: string;
  lvl?: number;
  custom?: boolean;
  page?: number;
}

export interface Question {
  id: string;
  skill: Skill;
  topic: string;
  lvl: number;
  q: string;
  opts: string[];
  a: number;
  expl: string;
  wrong: string[];
  exam?: string;
  src?: string;
  typ: 'mcq' | 'type' | 'sent';
  passage?: string | null;
  key?: string;
  audio?: string;
  hint?: string;
  answer?: string;
  wid?: string;
  ai?: boolean;
}

export interface Passage {
  id: string;
  title: string;
  skill: 'reading' | 'listening';
  src?: string;
  text: string;
}

export interface Lesson {
  id: string;
  module: string;
  exam: string;
  title: string;
  icon: string;
  min: number;
  topic: string;
  explain: string[];
  example: string;
  task?: { type: 'vocab' | 'writing' | 'speaking'; id?: string } | null;
  tip?: string;
}
export interface Module {
  id: string;
  title: string;
  icon: string;
  exam: string;
}

export interface WritingPrompt {
  id: string;
  exam: string;
  kind: string;
  min: number;
  minWords: number;
  title: string;
  prompt: string;
}
export interface SpeakingPrompts {
  part1: string[];
  part2: { topic: string; points: string[] }[];
  part3: string[];
}
export interface SourceItem {
  cat: 'own' | 'open' | 'ai' | 'user';
  title: string;
  license: string;
  year: number;
  url?: string;
}

export interface Profile {
  goal: { ielts: number; sat: number };
  dates: { ielts: string | null; sat: string | null };
  created: string;
}
export interface Streak {
  count: number;
  last: string | null;
  freezes: number;
}
export interface Card {
  id: string;
  kind: 'word' | 'error';
  ef: number;
  int: number;
  reps: number;
  due: string;
  lapses: number;
  seen: number;
  ok: number;
}
export interface ErrorEntry {
  id: string;
  qid: string;
  q: Question;
  ans: number | string | null;
  date: string;
  count: number;
  topic: string;
  skill: string;
}
export interface BookEntry {
  id: string;
  w: string;
  tr: string;
  def: string;
  page: number;
}
export interface Book {
  id: string;
  title: string;
  entries: BookEntry[];
}
export interface Homework {
  id: string;
  book: string;
  from: number;
  to: number;
  created: string;
  done: boolean;
}
export interface Diag {
  date: string;
  skills: Record<string, number>;
  cefr: string;
  band: number | null;
  sat: number | null;
  weak: string[];
}
export interface ExamRecord {
  id: string;
  type: ExamKind;
  date: string;
  band?: number;
  sat?: number;
  parts: Record<string, number>;
  mode: string;
  mins: number;
}
export interface GradeCriterion {
  name: string;
  band: number;
  comment?: string;
}
export interface GradeError {
  original: string;
  fix: string;
  why?: string;
}
export interface GradeResult {
  local?: boolean;
  overall: number;
  criteria: GradeCriterion[];
  errors: GradeError[];
  improved?: string;
  wpm?: number;
}
export interface WritingRecord {
  id: string;
  title: string;
  date: string;
  overall: number;
  words?: number;
  local?: boolean;
}
export interface SpeakingRecord {
  date: string;
  overall: number;
  local?: boolean;
}
export interface SkillStat {
  n: number;
  ok: number;
  w: number;
  wok: number;
}
export interface ReviewItem {
  kind: 'q';
  q: Question;
  ans: number | string | null;
}
export interface ReviewText {
  kind: 'text';
  skill: string;
  title: string;
  original: string;
  fix: string;
  why?: string;
}
export interface ReviewSession {
  title: string;
  items: ReviewItem[];
  extra: ReviewText[];
}
export interface UserText {
  id: string;
  title: string;
  text: string;
  src: string;
}
export interface QResult {
  q: Question;
  ans: number | string | null;
  ok: boolean;
  ms: number;
}
export interface QuizResult {
  results: QResult[];
  total: number;
  ok: number;
  timeUp: boolean;
}
