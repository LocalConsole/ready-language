import { useMemo } from 'react';
import { useData } from '@/data';
import { useProgress } from '@/store/progress';
import { buildIndex } from './words';
import { today } from './util';
import { dueCards } from './srs';

/** Индекс слов: встроенные + свои + из книг. */
export function useWordIndex() {
  const words = useData((s) => s.D.words);
  const custom = useProgress((s) => s.customWords);
  const books = useProgress((s) => s.books);
  return useMemo(() => buildIndex(words, custom, books), [words, custom, books]);
}
export const useAllWords = () => {
  const idx = useWordIndex();
  return useMemo(() => Object.values(idx), [idx]);
};
export function useDueWords() {
  const cards = useProgress((s) => s.cards);
  return useMemo(() => dueCards(cards, 'word'), [cards, today()]); // eslint-disable-line react-hooks/exhaustive-deps
}
export const useGoals = () => {
  const g = useProgress((s) => s.profile?.goal);
  return { ielts: !!g?.ielts, sat: !!g?.sat };
};
export const useBeginner = () => {
  const diag = useProgress((s) => s.diag);
  const xp = useProgress((s) => s.xp);
  return !diag || (diag.skills?.vocab != null && diag.skills.vocab < 0.5) || Math.floor(Math.sqrt(xp / 60)) + 1 < 3;
};
