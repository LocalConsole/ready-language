/** Локальная (без ИИ) оценка Writing/Speaking. Это грубая эвристика — интерфейс честно помечает её как приблизительную. */
import type { GradeResult } from '@/types';
import { t } from '@/i18n';
import { clamp } from './util';

const LINK = ['however', 'moreover', 'furthermore', 'therefore', 'in addition', 'for example', 'for instance', 'on the other hand', 'as a result', 'consequently', 'although', 'whereas', 'in conclusion', 'firstly', 'secondly', 'nevertheless', 'while'];
const FILL = ['um', 'uh', 'er', 'like', 'you know', 'i mean'];
const half = (x: number) => clamp(Math.round(x * 2) / 2, 3, 8);

export function localWriting(text: string, minWords: number): GradeResult {
  const words = text.match(/[A-Za-z']+/g) || [];
  const n = words.length;
  const sents = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 3);
  const uniq = new Set(words.map((w) => w.toLowerCase())).size;
  const ttr = n ? uniq / n : 0;
  const lw = text.toLowerCase();
  const links = LINK.filter((l) => lw.includes(l)).length;
  const paras = text.split(/\n\s*\n/).filter((x) => x.trim()).length;
  const avg = sents.length ? n / sents.length : 0;
  const long = words.filter((w) => w.length >= 8).length / Math.max(n, 1);
  const ta = half(3 + Math.min(n / minWords, 1.15) * 3.2);
  const cc = half(3.5 + Math.min(links, 6) * 0.45 + (paras >= 3 ? 0.8 : 0));
  const lr = half(3.5 + ttr * 3.4 + long * 6);
  const gr = half(4 + Math.min(avg, 22) / 8 + (sents.length >= 8 ? 0.8 : 0));
  const errors: GradeResult['errors'] = [];
  if (n < minWords) errors.push({ original: t('({n} слов)', { n }), fix: t('Нужно минимум {n}', { n: minWords }), why: t('Недобор слов сильно снижает Task Achievement/Response.') });
  if (links < 3) errors.push({ original: t('(мало связок)'), fix: 'However, Moreover, As a result…', why: t('Связки повышают Coherence & Cohesion, но не злоупотребляй ими.') });
  if (paras < 3) errors.push({ original: t('(структура)'), fix: t('Раздели на 4 абзаца'), why: 'Intro / Body 1 / Body 2 / Conclusion.' });
  const rep: Record<string, number> = {};
  words.forEach((w) => {
    w = w.toLowerCase();
    if (w.length > 4) rep[w] = (rep[w] || 0) + 1;
  });
  Object.entries(rep).filter(([, c]) => c >= 5).slice(0, 3).forEach(([w, c]) => errors.push({ original: `${w} ×${c}`, fix: t('Найди синонимы'), why: t('Повторы снижают Lexical Resource.') }));
  return {
    local: true,
    overall: Math.round(((ta + cc + lr + gr) / 4) * 2) / 2,
    criteria: [
      { name: 'Task Response', band: ta, comment: t('Слов: {n}', { n }) + (n < minWords ? t(' — меньше нормы') : '') + '.' },
      { name: 'Coherence & Cohesion', band: cc, comment: t('Связок: {l}, абзацев: {p}.', { l: links, p: paras }) },
      { name: 'Lexical Resource', band: lr, comment: t('Разнообразие лексики (TTR): {v}.', { v: ttr.toFixed(2) }) },
      { name: 'Grammatical Range & Accuracy', band: gr, comment: t('Средняя длина предложения: {v} слов. Точность грамматики локально не проверяется.', { v: avg.toFixed(1) }) },
    ],
    errors,
    improved: '',
  };
}

export function localSpeaking(transcript: string, secs: number): GradeResult {
  const words = transcript.match(/[A-Za-z']+/g) || [];
  const n = words.length;
  const wpm = secs ? Math.round(n / (secs / 60)) : 0;
  const lw = ' ' + transcript.toLowerCase() + ' ';
  const fill = FILL.reduce((a, f) => a + (lw.split(' ' + f + ' ').length - 1), 0);
  const uniq = new Set(words.map((w) => w.toLowerCase())).size;
  const fc = half(3.5 + Math.min(wpm, 130) / 35 - fill * 0.15);
  const lr = half(3.5 + (n ? uniq / n : 0) * 4);
  const gr = half(4 + Math.min(n, 160) / 50);
  const pr = half(5);
  return {
    local: true,
    wpm,
    overall: Math.round(((fc + lr + gr + pr) / 4) * 2) / 2,
    criteria: [
      { name: 'Fluency & Coherence', band: fc, comment: t('Темп ≈ {wpm} слов/мин, слов-паразитов: {f}.', { wpm, f: fill }) },
      { name: 'Lexical Resource', band: lr, comment: t('Оценка по разнообразию слов.') },
      { name: 'Grammatical Range & Accuracy', band: gr, comment: t('Локально точность грамматики не проверяется.') },
      { name: 'Pronunciation', band: pr, comment: t('Без ИИ и аудио-анализа произношение не оценивается — это нейтральное значение.') },
    ],
    errors: fill ? [{ original: 'um / uh / like', fix: t('Делай паузу вместо паразитов'), why: t('Паузы звучат увереннее.') }] : [],
    improved: '',
  };
}
