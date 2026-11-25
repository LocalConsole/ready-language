// Вспомогательный скрипт разработки: создаёт заглушки для ещё не написанных страниц из App.tsx
import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
for (const m of app.matchAll(/import\('@\/([^']+)'\)/g)) {
  const f = `src/${m[1]}.tsx`;
  if (!fs.existsSync(f)) {
    fs.mkdirSync(f.replace(/\/[^/]+$/, ''), { recursive: true });
    fs.writeFileSync(f, `export default function Stub() { return <div className="card">TODO ${m[1]}</div>; }\n`);
    console.log('stub', f);
  }
}
