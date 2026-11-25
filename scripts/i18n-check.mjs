// Извлекает все t('…') из src и проверяет покрытие en (src/i18n/en.ts) и uz (uz.json ui + uzExtra.ts).
// Использование: node scripts/i18n-check.mjs [--list] [--dump keys.json]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(path.join(root, 'src')).filter((f) => /\.(tsx?|ts)$/.test(f) && !/i18n[\\/](en|uz|uzExtra)\.ts$/.test(f));
const re = /\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`)/g;
const keys = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    const k = (m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'").replace(/\\n/g, '\n');
    if (/[А-Яа-яЁё]/.test(k)) keys.add(k);
  }
}
// Косвенные вызовы t(var): таблицы навигации, достижений, аффиксов и т.п. — берём все русские строковые литералы файлов с такими таблицами
const lit = /'((?:[^'\\\n]|\\.)*[А-Яа-яЁё](?:[^'\\\n]|\\.)*)'/g;
const INDIRECT = ['components/Layout.tsx', 'components/Morph.tsx', 'data/books.ts', 'features/vocab/VocabHub.tsx', 'features/mistakes/Journal.tsx', 'store/progress.ts', 'pages/Profile.tsx', 'pages/Practice.tsx', 'pages/Sources.tsx', 'pages/Home.tsx', 'lib/lessons.ts', 'lib/achievements.ts', 'lib/mascot.ts', 'lib/plan.ts'];
for (const f of files) {
  if (!INDIRECT.some((x) => f.replace(/\\/g, '/').endsWith(x))) continue;
  for (const m of fs.readFileSync(f, 'utf8').matchAll(lit)) keys.add(m[1].replace(/\\'/g, "'"));
}
try {
  const L = JSON.parse(fs.readFileSync(path.join(root, 'src/data/lessons.json'), 'utf8'));
  [...(L.modules || []), ...(L.lessons || [])].forEach((x) => x.title && /[А-Яа-яЁё]/.test(x.title) && keys.add(x.title));
} catch { /* нет lessons.json */ }
const load = (f, name) => {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  const i = s.indexOf(name);
  const obj = s.slice(s.indexOf('{', i));
  return Function('return (' + obj.replace(/;\s*$/, '') + ')')();
};
const EN = load('src/i18n/en.ts', 'EN');
const UX = load('src/i18n/uzExtra.ts', 'UZ_EXTRA');
const uzJson = JSON.parse(fs.readFileSync(path.join(root, 'src/data/uz.json'), 'utf8'));
const uzUi = uzJson.ui || {};
const missEn = [...keys].filter((k) => !(k in EN));
const missUz = [...keys].filter((k) => !(k in UX) && !(k in uzUi));
if (process.argv.includes('--dump')) fs.writeFileSync(process.argv[process.argv.indexOf('--dump') + 1], JSON.stringify({ en: missEn, uz: missUz }, null, 1));
if (process.argv.includes('--list')) { console.log('EN missing:\n' + missEn.join('\n')); }
console.log(`ключей t(): ${keys.size}; нет перевода en: ${missEn.length}; нет перевода uz (точное совпадение; остальное — через trUz): ${missUz.length}`);
if (missEn.length && process.argv.includes('--strict')) process.exit(1);
