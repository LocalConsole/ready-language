# Миша — IELTS & Digital SAT «от нуля до экзамена»

PWA на **React + Vite + TypeScript** (React Router `HashRouter`, Zustand, Dexie/IndexedDB, Framer Motion). Ведёт русский медведь Миша. Без бэкенда: ИИ ходит через готовый прокси на Google Apps Script.

## Запуск локально
```bash
npm ci
npm run dev        # http://localhost:5173/ready-language/
npm run build      # tsc -b && vite build → dist/ (с service worker)
npm run preview    # http://localhost:4173/ready-language/
npm run typecheck
npm run i18n:check # покрытие переводов en/uz
npm test           # Playwright (сборка + preview поднимаются сами)
```
Тесты в песочнице без скачанного Chromium: `CHROME_PATH=/usr/bin/google-chrome npm test`. Первый раз: `npx playwright install chromium`.

## Деплой
`.github/workflows/deploy.yml` на каждый push в `main` собирает проект и публикует `dist` на GitHub Pages (`base: '/ready-language/'`). В настройках репозитория: Settings → Pages → Source: **GitHub Actions**. `test.yml` гоняет Playwright на pull request.

## ИИ (`src/lib/ai.ts`)
Единственная точка входа. `POST` на прокси, `Content-Type: text/plain`, тело `{"prompt","system","long"}`; ответ `{"text","provider"}` или `{"error"}`. Адрес можно переопределить через `VITE_AI_PROXY_URL`. Ключей API в коде нет.
- `long:true` — только проверка Writing/Speaking и длинные разборы ошибок («Объясни проще»); короткие определения идут без него.
- Ответы кэшируются в IndexedDB по SHA-256(system+prompt); одинаковые одновременные запросы объединяются.
- При ошибке прокси включается пауза (2 мин; 10 мин при лимите) — повторных запросов нет, UI показывает локальный вариант.
- Запасной вариант: свой ключ Groq/Gemini/OpenRouter в Настройках (только `localStorage`, в экспорт не попадает).

## Структура
```
src/
  components/   Mascot, Quiz (движок тестов), Layout, Toasts, Calculator, ErrorBoundary…
  pages/        Home, Start (онбординг), Practice, Profile, Settings, Sources, Dash (аналитика)
  features/
    diagnostic/ адаптивная диагностика        lessons/  карта пути и уроки
    reader/     читалка, тап по слову         vocab/    SRS, режимы, книги, домашки
    mistakes/   разбор с Мишей, журнал        exams/    IELTS, SAT (адаптивно), отчёт
    writing/ speaking/ shadow/                проверка Writing/Speaking, диктанты
  store/        Zustand: progress (→ IndexedDB), settings (→ localStorage), ui
  lib/          ai.ts, aiTasks.ts, db.ts (Dexie), srs, plan, calc (безопасный парсер), sanitize…
  data/         words, questions, lessons, prompts, sources, uz (JSON) + books.ts
  i18n/         t('русский текст'): en.ts, uzExtra.ts, uz.ts (+ data/uz.json)
  sw.ts         service worker (precache, офлайн, «Миша скучает»)
e2e/            Playwright-тесты   docs/BUGS.md  баги старой версии   TEST_CHECKLIST.md
tools/          сборщики контента (Python)   worker/  Cloudflare Worker (опциональный прокси)
```
Прогресс (XP, SRS, ошибки, экзамены, тексты) — в IndexedDB `misha-react`; настройки — в `localStorage`. Экспорт/импорт — Настройки → «Данные» (JSON без ключей; импорт валидируется и очищается). Старый прогресс из версии на чистом JS (`localStorage misha.state`) мигрирует при первом запуске.

## Контент
См. [CONTENT_GUIDE.md](CONTENT_GUIDE.md): свои слова и тексты (в браузере), добавление слов, вопросов и уроков через `tools/build_data.py`.

## Честные ограничения
- Встроенная база небольшая: 256 слов, 65 вопросов, 18 уроков, 2 текста Reading, 2 сценария Listening. «3000 слов» — только через ИИ/импорт/расширение `tools/words.txt`.
- Reading/Listening в пробнике сокращены под встроенный банк; Writing/Speaking — настоящие тайминги.
- Listening озвучивается голосами браузера (Web Speech API).
- Оценка Writing/Speaking без ИИ — приблизительная эвристика (помечается в интерфейсе); с ИИ — ориентир, не официальный балл.
- Английский интерфейс переведён полностью, **но учебное содержимое** (тексты уроков, объяснения к вопросам) остаётся на русском; узбекский — через словарь `uz.json` + `trUz()`.
- PDF не разбирается без внешней библиотеки; фоновые «Миша скучает» работают только там, где есть Periodic Background Sync (Chrome/Android PWA).
- Тексты и словари защищённых книг не включены.
