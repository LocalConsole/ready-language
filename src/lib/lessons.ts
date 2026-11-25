import type { Dataset } from '@/data';
import type { Lesson, Module } from '@/types';
import type { ProgressState } from '@/store/progress';

const SKILL_MOD: Record<string, string> = { vocab: 'vocab', grammar: 'grammar', reading: 'reading', listening: 'listening', rw: 'sat_rw', math: 'sat_math' };

export function modulesFor(D: Dataset, s: ProgressState): Module[] {
  const g = s.profile?.goal;
  const ielts = !!g?.ielts, sat = !!g?.sat;
  return D.modules.filter((m) => m.exam === 'both' || (m.exam === 'ielts' && ielts) || (m.exam === 'sat' && sat));
}
export function lessonsFor(D: Dataset, s: ProgressState): Lesson[] {
  const ids = modulesFor(D, s).map((m) => m.id);
  return D.lessons.filter((l) => ids.includes(l.module));
}
/** Следующий урок: сначала по слабым навыкам из диагностики, затем по порядку. */
export function nextLesson(D: Dataset, s: ProgressState): Lesson | null {
  const todo = lessonsFor(D, s).filter((l) => !s.lessons[l.id]);
  if (!todo.length) return null;
  for (const sk of s.diag?.weak || []) {
    const l = todo.find((x) => x.module === SKILL_MOD[sk]);
    if (l) return l;
  }
  return todo[0];
}
export const topicName = (id: string, t: (s: string) => string): string =>
  t(
    ({
      tenses_pp: 'Present Perfect / Past Simple', articles: 'Артикли', conditionals: 'Условные', passive: 'Пассив', prepositions: 'Предлоги',
      relative: 'Относительные придаточные', modal: 'Модальные глаголы', subject_verb: 'Согласование', reported: 'Косвенная речь',
      comparatives: 'Степени сравнения', gerunds: 'Герундий / инфинитив', tfng: 'True/False/Not Given', mcq_reading: 'Reading: выбор ответа',
      headings: 'Reading: заголовки', listening_form: 'Listening: форма', listening_lecture: 'Listening: лекции', sat_transitions: 'SAT: связки',
      sat_boundaries: 'SAT: границы предложений', sat_vocab: 'SAT: слова в контексте', sat_concision: 'SAT: краткость', m_linear: 'Math: линейные ур-я',
      m_quad: 'Math: квадраты и функции', m_percent: 'Math: проценты и отношения', m_geo: 'Math: геометрия', words: 'Словарь',
    } as Record<string, string>)[id] || id,
  );
