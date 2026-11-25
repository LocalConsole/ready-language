import type { ProgressState } from '@/store/progress';
import { dayDiff, today } from './util';

export function estimate(s: ProgressState) {
  const li = s.exams.filter((e) => e.type === 'ielts').slice(-1)[0];
  const ls = s.exams.filter((e) => e.type === 'sat').slice(-1)[0];
  const band = li?.band ?? s.diag?.band ?? null;
  const sat = ls?.sat ?? s.diag?.sat ?? null;
  return { band, sat };
}
export function studiedHours(s: ProgressState) {
  return Object.values(s.daily).reduce((a, d) => a + (d.min || 0), 0) / 60;
}
export function hoursNeeded(s: ProgressState) {
  const p = s.profile;
  if (!p) return 0;
  const e = estimate(s);
  let h = 0;
  if (p.goal.ielts) h += Math.max(0, p.goal.ielts - (e.band ?? 3.5)) * 70;
  if (p.goal.sat) h += (Math.max(0, p.goal.sat - (e.sat ?? 900)) / 100) * 35;
  return Math.max(h, 6);
}
export function daysLeft(s: ProgressState) {
  const p = s.profile;
  if (!p) return 0;
  const ds = [p.dates?.ielts, p.dates?.sat].filter(Boolean).sort() as string[];
  return ds.length ? Math.max(1, dayDiff(today(), ds[0])) : 90;
}
/** Сколько минут в день нужно, чтобы успеть к ближайшей дате (15–120). */
export function minutesPerDay(s: ProgressState) {
  const left = Math.max(hoursNeeded(s) - studiedHours(s) * 0.8, 2) * 60;
  return Math.min(120, Math.max(15, Math.ceil(left / daysLeft(s))));
}
export const todayMin = (s: ProgressState) => s.daily[today()]?.min || 0;

export const cefr = (a: number) => (a < 0.2 ? 'A1' : a < 0.38 ? 'A2' : a < 0.55 ? 'B1' : a < 0.72 ? 'B2' : a < 0.87 ? 'C1' : 'C2');
export const toBand = (a: number) => Math.round((2.5 + 6.5 * a) * 2) / 2;
export const toSat = (a: number) => Math.round((400 + 1200 * a) / 10) * 10;

export const level = (xp: number) => Math.floor(Math.sqrt(xp / 60)) + 1;
export const lvlProgress = (xp: number) => {
  const l = level(xp);
  const a = 60 * (l - 1) * (l - 1);
  const b = 60 * l * l;
  return (xp - a) / (b - a);
};
export function outfit(xp: number, achievements: string[]) {
  const l = level(xp);
  return { scarf: l >= 3 ? (l >= 6 ? 2 : 1) : 0, hat: l >= 5 ? (l >= 8 ? 2 : 1) : 0, samovar: l >= 4 || achievements.includes('streak7') };
}
