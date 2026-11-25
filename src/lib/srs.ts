import type { Card } from '@/types';
import { addDays, today } from './util';

export const newCard = (id: string, kind: Card['kind'] = 'word'): Card => ({ id, kind, ef: 2.5, int: 0, reps: 0, due: today(), lapses: 0, seen: 0, ok: 0 });

/** SM-2. q: 0–5. Забытая карточка (q<3) возвращается завтра, а не «сегодня же» (так обещает интерфейс). */
export function gradeCard(c: Card, q: number): Card {
  const n = { ...c, seen: c.seen + 1 };
  if (q >= 3) {
    n.ok++;
    n.reps++;
    n.int = n.reps === 1 ? 1 : n.reps === 2 ? 3 : Math.round(n.int * n.ef);
  } else {
    n.reps = 0;
    n.int = 1;
    n.lapses++;
  }
  n.ef = Math.max(1.3, n.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  n.due = addDays(today(), Math.max(n.int, 1));
  return n;
}
export const mastery = (c?: Card): 0 | 1 | 2 => (!c ? 0 : c.reps >= 4 ? 2 : c.reps >= 1 ? 1 : 0);
export const dueCards = (cards: Record<string, Card>, kind?: Card['kind']) => {
  const t = today();
  return Object.values(cards).filter((c) => c.due <= t && (!kind || c.kind === kind));
};
