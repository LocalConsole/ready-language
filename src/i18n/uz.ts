/**
 * Узбекский язык. Источник — src/data/uz.json (собирается tools/build_uz.py из tools/uz*.txt):
 *  ui    — русская фраза ⇒ узбекская (интерфейс),
 *  data  — перевод длинных строк уроков/вопросов,
 *  words — перевод слов по id.
 * Файл грузится лениво, только когда выбран узбекский.
 */
export interface UzJson {
  ui: Record<string, string>;
  data: Record<string, string>;
  words: Record<string, string>;
}

const CY = /[А-Яа-яЁё]/;
const LET = 'А-Яа-яЁё';
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PATTERNS: [RegExp, string][] = [
  [/^([\d.,]+) ч$/, '$1 soat'],
  [/^Слово (\d+) из (\d+)$/, "$1 / $2 so'z"],
  [/^Новое слово (\d+) из (\d+)$/, "Yangi so'z $1 / $2"],
  [/^Вопрос (\d+) из (\d+)$/, 'Savol $1 / $2'],
  [/^Что означает слово «(.+)»\?$/, "«$1» so'zi nimani anglatadi?"],
  [/^Как по-английски: «(.+)»\?$/, 'Inglizchada qanday: «$1»?'],
  [/^Составь предложение со словом «(.+)»\.?$/, "«$1» so'zi bilan gap tuz."],
  [/^«(.+)» — это перевод слова «(.+)»\.?$/, "«$1» — bu «$2» so'zining tarjimasi."],
];

let json: UzJson | null = null;
let map = new Map<string, string>();
let re: RegExp | null = null;

function build(ui: Record<string, string>) {
  map = new Map();
  const keys: string[] = [];
  const SHORT = ['из', 'мин', 'слов', 'стр.', 'дн.', 'Слово', 'Ответ', 'Опыт', 'Миша', 'Урок:', 'цель', 'Понял', 'Назад', 'Дальше', 'прил.', 'гл.', 'сущ.', 'Слов:', 'легче', 'Шарф', 'ИИ', 'серия'];
  for (const k in ui) {
    const kk = k.trim();
    map.set(kk, ui[k]);
    if (kk.length >= 6 || SHORT.includes(kk)) keys.push(kk);
  }
  keys.sort((a, b) => b.length - a.length);
  const part = (k: string) => {
    const a = CY.test(k[0]) ? `(?<![${LET}])` : '';
    const z = CY.test(k[k.length - 1]) ? `(?![${LET}])` : '';
    return a + escRe(k) + z;
  };
  re = keys.length ? new RegExp(keys.map(part).join('|'), 'g') : null;
}

export async function loadUz(): Promise<UzJson> {
  if (json) return json;
  const m = await import('../data/uz.json');
  json = m.default as unknown as UzJson;
  build(json.ui);
  return json;
}
export const uzLoaded = () => json !== null;
export const uzJson = () => json;

/** Перевод одной строки интерфейса: точное совпадение → шаблон → подстановка известных фрагментов. */
export function trUz(s: string): string {
  if (!s || !CY.test(s) || !json) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  const core = m[2];
  let r = map.get(core);
  if (r == null) {
    for (const [rx, rep] of PATTERNS) {
      if (rx.test(core)) {
        r = core.replace(rx, rep);
        break;
      }
    }
    if (r == null) r = re ? core.replace(re, (x) => map.get(x) || x) : core;
  }
  return m[1] + r + m[3];
}

/** Рекурсивно переводит строки данных (вопросы, уроки, источники). Возвращает новую копию. */
export function translateData<T>(o: T): T {
  if (!json) return o;
  const d = json.data;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return CY.test(v) && d[v] ? d[v] : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k in v as Record<string, unknown>) out[k] = walk((v as Record<string, unknown>)[k]);
      return out;
    }
    return v;
  };
  return walk(o) as T;
}
