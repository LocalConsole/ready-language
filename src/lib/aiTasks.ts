/** Прикладные ИИ-функции. Каждая возвращает null, если ИИ недоступен — вызывающий код показывает локальный вариант. */
import type { GradeResult, Question } from '@/types';
import { ask, askJSON } from './ai';
import { hash } from './util';
import { stripTags } from './sanitize';

const num = (x: unknown, d = 0) => (typeof x === 'number' && isFinite(x) ? x : Number.isFinite(parseFloat(String(x))) ? parseFloat(String(x)) : d);
const str = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x));

export interface WordInfo {
  tr: string;
  def: string;
  pos: string;
  ipa: string;
  ex: string;
  mnemonic: string;
}
export async function wordInfo(word: string): Promise<WordInfo | null> {
  try {
    const { data } = await askJSON<Record<string, unknown>>({
      system: 'You are a precise bilingual English dictionary. Output JSON only.',
      prompt: `Give JSON for the English word "${word.toLowerCase()}": {"tr":"short translation","def":"simple English definition","pos":"part of speech","ipa":"/ipa/","ex":"one example sentence","mnemonic":"a short mnemonic"}`,
    });
    if (!data || !data.tr) return null;
    return { tr: str(data.tr), def: str(data.def), pos: str(data.pos), ipa: str(data.ipa), ex: str(data.ex), mnemonic: str(data.mnemonic) };
  } catch {
    return null;
  }
}

export async function mnemonic(w: string, tr: string): Promise<string | null> {
  try {
    return (await ask({ prompt: `Make up a short mnemonic (sound-alike + image) to remember the English word "${w}" = "${tr}". One or two sentences.` })).text;
  } catch {
    return null;
  }
}

export async function explainSimpler(q: Question, userAns: number | string | null): Promise<string | null> {
  try {
    const mine = userAns == null ? 'none' : typeof userAns === 'number' ? q.opts[userAns] : userAns;
    const r = await ask({
      long: true,
      system: 'You are Misha, a friendly bear tutor of English. Be short and warm, with a little humor.',
      prompt: `Explain this mistake in very simple words (5-6 sentences, like to a child).\nQuestion: ${q.q}\nOptions: ${q.opts.join(' | ')}\nCorrect: ${q.typ === 'mcq' ? q.opts[q.a] : q.answer}\nStudent answered: ${mine}\nAlready explained: ${stripTags(q.expl)}`,
    });
    return r.text;
  } catch {
    return null;
  }
}

function normGrade(d: Record<string, unknown>): GradeResult | null {
  const overall = num(d.overall, NaN);
  if (!isFinite(overall)) return null;
  const criteria = (Array.isArray(d.criteria) ? d.criteria : []).map((c: any) => ({ name: str(c?.name), band: num(c?.band), comment: str(c?.comment) })).filter((c) => c.name);
  const errors = (Array.isArray(d.errors) ? d.errors : []).map((e: any) => ({ original: str(e?.original), fix: str(e?.fix), why: str(e?.why) })).filter((e) => e.original || e.fix);
  return { overall, criteria, errors, improved: str(d.improved) };
}

export async function gradeWriting(task: string, text: string, exam: string): Promise<GradeResult | null> {
  const crit = exam === 'sat' ? 'Standard English Conventions, Expression of Ideas, Organization, Word Choice' : 'Task Response/Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy';
  try {
    const { data } = await askJSON<Record<string, unknown>>({
      long: true,
      system: 'You are a strict certified IELTS/SAT examiner. Output JSON only. Quotes stay in English.',
      prompt: `Grade this ${exam === 'sat' ? 'SAT' : 'IELTS'} writing. Task: ${task}\nCriteria: ${crit}.\nReturn JSON: {"overall":number (IELTS band 0-9 in 0.5 steps; for SAT 1-4 scale of overall quality),"criteria":[{"name":"","band":number,"comment":""}],"errors":[{"original":"exact fragment","fix":"correction","why":"explanation"}],"improved":"improved full version of the text"}\nText:\n${text}`,
    });
    return normGrade(data);
  } catch {
    return null;
  }
}

export async function gradeSpeaking(prompt: string, transcript: string, wpm: number): Promise<GradeResult | null> {
  try {
    const { data } = await askJSON<Record<string, unknown>>({
      long: true,
      system: 'You are a strict certified IELTS speaking examiner. Output JSON only.',
      prompt: `Task: ${prompt}\nTranscript (speech recognition, may lack punctuation), pace ${wpm || '?'} wpm:\n${transcript}\nReturn JSON: {"overall":number,"criteria":[{"name":"Fluency & Coherence","band":0,"comment":""},{"name":"Lexical Resource","band":0,"comment":""},{"name":"Grammatical Range & Accuracy","band":0,"comment":""},{"name":"Pronunciation (estimate from text only)","band":0,"comment":""}],"errors":[{"original":"","fix":"","why":""}],"improved":"a better version of the answer"}`,
    });
    return normGrade(data);
  } catch {
    return null;
  }
}

export async function simplify(text: string): Promise<string | null> {
  try {
    return (await ask({ prompt: 'Rewrite this text in simple English (CEFR A2-B1), keep the meaning, keep paragraphs. Output only the text:\n' + text.slice(0, 3500) })).text;
  } catch {
    return null;
  }
}

const mkQ = (j: any, extra: Partial<Question>): Question | null => {
  if (!j || !j.q || !Array.isArray(j.opts) || j.opts.length < 2) return null;
  const opts = j.opts.map(str);
  const a = Math.max(0, Math.min(opts.length - 1, num(j.a)));
  return { id: 'ai_' + hash(str(j.q)), skill: 'reading', topic: 'mcq_reading', lvl: 2, q: str(j.q), opts, a, expl: str(j.expl), wrong: opts.map(() => ''), typ: 'mcq', src: 'ИИ', ai: true, ...extra };
};

export async function makeQuestions(text: string): Promise<Question[] | null> {
  try {
    const { data } = await askJSON<{ qs?: unknown[] }>({
      prompt: `Write 4 multiple-choice reading comprehension questions (IELTS style) for this text. JSON: {"qs":[{"q":"","opts":["","","",""],"a":0,"expl":"short explanation"}]}\n${text.slice(0, 3500)}`,
    });
    const qs = (data.qs || []).map((q, i) => mkQ(q, { id: 'ai_' + hash(str((q as any)?.q) + i), exam: 'ielts' })).filter(Boolean) as Question[];
    return qs.length ? qs : null;
  } catch {
    return null;
  }
}

export async function extraQuestion(topicId: string, topicLabel: string, lvl: number): Promise<Question | null> {
  try {
    const { data } = await askJSON<unknown>({
      prompt: `Create ONE new multiple-choice practice question (4 options) on the topic "${topicLabel}" for an IELTS/SAT learner, level ${lvl}/3. JSON: {"q":"","opts":["","","",""],"a":0,"expl":"detailed explanation"}`,
    });
    return mkQ(data, { topic: topicId, skill: 'grammar', lvl, src: 'ИИ-генерация' });
  } catch {
    return null;
  }
}
