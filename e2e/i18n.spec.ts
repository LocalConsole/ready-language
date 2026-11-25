import { expect, test } from '@playwright/test';
import { errorGuard, onboard } from './helpers';

const ROUTES = ['home', 'path', 'practice', 'vocab', 'books', 'reader', 'journal', 'review', 'writing', 'speaking', 'shadow', 'exam', 'dash', 'me', 'settings', 'sources', 'quick'];

test('английский интерфейс: на основных экранах нет кириллицы в UI', async ({ page }) => {
  test.setTimeout(120000);
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/settings');
  await page.locator('#lg').selectOption('en');
  await expect(page.getByText('Interface language')).toBeVisible();
  for (const r of ROUTES) {
    await page.goto('./#/' + r);
    await page.waitForTimeout(300);
    const txt = await page.locator('#main, main').first().innerText();
    // данные уроков/вопросов остаются на русском (известное ограничение) — проверяем только «хром» экранов
    const chrome = await page.locator('h1, h2, .btn, label, nav a, .chip, summary').allInnerTexts();
    const bad = chrome.filter((x) => /[А-Яа-яЁё]/.test(x));
    expect.soft(bad, `route ${r}: ${bad.slice(0, 3).join(' | ')}`).toEqual([]);
    void txt;
  }
  g.check();
});

test('узбекский интерфейс переключается без ошибок', async ({ page }) => {
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/settings');
  await page.locator('#lg').selectOption('uz');
  await page.goto('./#/home');
  await expect(page.locator('nav a').first()).not.toHaveText(/Главная/);
  g.check();
});
