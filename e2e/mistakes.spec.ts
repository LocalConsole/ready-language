import { expect, test } from '@playwright/test';
import { answerQuiz, errorGuard, mockAI, onboard } from './helpers';

/** Создаёт ошибки: режим «ввод» с заведомо неверным ответом. */
async function makeErrors(page: import('@playwright/test').Page) {
  await page.goto('./#/vocab/mode/type');
  await answerQuiz(page, { feedback: true, n: 10 });
  await expect(page.getByTestId('mode-done')).toBeVisible();
}

test.describe('Ошибки', () => {
  test('разбор: Миша объясняет проще (long:true), «Попробуй сам», журнал', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await makeErrors(page);
    await page.goto('./#/review');
    await expect(page.getByTestId('review-item')).toBeVisible();
    await page.getByTestId('simpler').click();
    await expect(page.getByTestId('ai-expl')).toContainText('Простое объяснение');
    const ex = calls.filter((c) => c.prompt.includes('Explain this mistake'));
    expect(ex.length).toBe(1);
    expect(ex[0].long).toBe(true);
    await page.getByTestId('journal-toggle').click();
    await page.getByTestId('try').click();
    await expect(page.getByTestId('try-quiz')).toBeVisible();
    await page.getByTestId('review-next').click();
    await expect(page.getByTestId('review-pos')).toContainText('2');
    g.check();
  });

  test('ИИ недоступен: объяснение — локальное, повторный запрос не уходит в сеть (cooldown)', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'error');
    await onboard(page);
    await makeErrors(page);
    await page.goto('./#/review');
    await page.getByTestId('simpler').click();
    await expect(page.getByTestId('ai-fallback')).toBeVisible();
    const n = calls.length;
    await page.getByTestId('review-next').click();
    await page.getByTestId('simpler').click();
    await expect(page.getByTestId('ai-fallback')).toBeVisible();
    expect(calls.length).toBe(n);
    g.check();
  });

  test('журнал, тренировка 3 ошибок, быстрый тест, пустой разбор', async ({ page }) => {
    const g = errorGuard(page);
    await mockAI(page, 'ok');
    await onboard(page);
    await page.goto('./#/review');
    await expect(page.getByTestId('review-empty')).toBeVisible();
    await makeErrors(page);
    await page.goto('./#/journal');
    await expect(page.getByTestId('journal-row').first()).toBeVisible();
    await page.getByTestId('journal-train').click();
    await answerQuiz(page, { feedback: true, n: 6 });
    await expect(page.getByTestId('train-done')).toBeVisible();
    await page.goto('./#/quick');
    await answerQuiz(page, { feedback: true, n: 8 });
    await expect(page.getByTestId('quick-done')).toBeVisible();
    g.check();
  });
});
