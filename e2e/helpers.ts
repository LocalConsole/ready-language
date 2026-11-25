import { expect, type Page, type Route } from '@playwright/test';

/** Ловит ошибки консоли и необработанные исключения. Вызови guard.check() в конце теста. */
export function errorGuard(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    // сетевые ошибки заблокированных внешних ресурсов не считаем (ИИ-прокси мокается, шрифтов нет)
    if (/Failed to load resource/.test(txt)) return;
    errors.push('console.error: ' + txt);
  });
  return {
    errors,
    check: () => expect(errors, 'ошибки в консоли браузера').toEqual([]),
  };
}

const WORD = { tr: 'тестовый перевод', def: 'a test definition', pos: 'noun', ipa: '/test/', ex: 'This is a test.', mnemonic: 'мнемоника-тест' };
const GRADE = {
  overall: 6.5,
  criteria: [
    { name: 'Task Response', band: 6.5, comment: 'Ответ по теме' },
    { name: 'Coherence & Cohesion', band: 6, comment: 'Связность средняя' },
    { name: 'Lexical Resource', band: 7, comment: 'Хорошая лексика' },
    { name: 'Grammatical Range & Accuracy', band: 6.5, comment: 'Мало ошибок' },
  ],
  errors: [{ original: 'He go to school', fix: 'He goes to school', why: 'Согласование' }],
  improved: 'An improved version of the text.',
};

export type AIMode = 'ok' | 'error' | 'hang';
export const aiCalls: { prompt: string; system: string; long: boolean }[] = [];

/** Подменяет ИИ-прокси (Google Apps Script) детерминированными ответами. */
export async function mockAI(page: Page, mode: AIMode = 'ok') {
  const calls: { prompt: string; system: string; long: boolean; contentType: string }[] = [];
  await page.route(/script\.google\.com|googleusercontent\.com/, async (route: Route) => {
    const req = route.request();
    let body: { prompt?: string; system?: string; long?: boolean } = {};
    try {
      body = JSON.parse(req.postData() || '{}');
    } catch {
      /* пустое тело */
    }
    calls.push({ prompt: body.prompt || '', system: body.system || '', long: !!body.long, contentType: req.headers()['content-type'] || '' });
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (mode === 'error') return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ error: 'quota exceeded' }) });
    if (mode === 'hang') return; // запрос повисает
    const p = body.prompt || '';
    let text: string;
    if (p.includes('Give JSON for the English word')) text = JSON.stringify(WORD);
    else if (p.includes('Grade this')) text = JSON.stringify(GRADE);
    else if (p.includes('IELTS Speaking Parts') || p.includes('Transcript (speech')) text = JSON.stringify({ ...GRADE, overall: 6 });
    else if (p.includes('Write 4 multiple-choice')) text = JSON.stringify({ qs: [1, 2, 3, 4].map((n) => ({ q: `AI question ${n}?`, opts: ['one', 'two', 'three', 'four'], a: 1, expl: 'ИИ-объяснение' })) });
    else if (p.includes('Create ONE new multiple-choice')) text = JSON.stringify({ q: 'AI extra question?', opts: ['a1', 'a2', 'a3', 'a4'], a: 2, expl: 'extra' });
    else if (p.includes('Rewrite this text in simple English')) text = 'Simple version of the text.\n\nSecond simple paragraph.';
    else if (p.includes('Explain this mistake')) text = 'Простое объяснение от ИИ-Миши.';
    else text = 'ok';
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ text, provider: 'mock' }) });
  });
  return calls;
}

/** Проходит онбординг: IELTS (+SAT), «Начать с нуля». */
export async function onboard(page: Page, o: { sat?: boolean; diag?: boolean } = {}) {
  await page.goto('./');
  await expect(page.getByTestId('goal-ielts')).toBeVisible();
  if (o.sat) await page.getByTestId('goal-sat').click();
  await page.getByTestId('start-next').click();
  await page.getByTestId('start-next2').click();
  await page.getByTestId(o.diag ? 'start-diag' : 'start-zero').click();
}

/** Отвечает на вопросы теста: всегда выбирает вариант pick (или вводит текст), пока тест не закончится. */
export async function answerQuiz(page: Page, o: { n?: number; pick?: number | 'right'; feedback?: boolean } = {}) {
  const n = o.n ?? 60;
  for (let i = 0; i < n; i++) {
    const go = page.getByTestId('quiz-go');
    if (!(await go.isVisible().catch(() => false))) {
      await page.waitForTimeout(150);
      if (!(await go.isVisible().catch(() => false))) return i;
    }
    const opts = page.locator('.opt');
    if (await opts.count()) {
      const k = typeof o.pick === 'number' ? o.pick : 0;
      await opts.nth(k).click();
      if (!o.feedback) await go.click();
      else {
        await expect(page.getByTestId('feedback')).toBeVisible();
        await go.click();
      }
    } else {
      await page.locator('input[type=text]').fill('answer');
      await go.click();
      if (o.feedback) {
        await expect(page.getByTestId('feedback')).toBeVisible();
        await go.click();
      }
    }
    await page.waitForTimeout(60);
  }
  return n;
}
