import { expect, test } from '@playwright/test';
import { answerQuiz, errorGuard, mockAI, onboard } from './helpers';

test.describe('Читалка', () => {
  test('библиотека → текст → тап по слову (локально и через ИИ) → в мои слова', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await page.goto('./#/reader');
    await page.getByTestId('text-link').first().click();
    await expect(page.getByTestId('reader')).toBeVisible();
    await page.locator('.reader .w').first().click();
    await expect(page.getByTestId('word-popup')).toBeVisible();
    await expect(page.getByTestId('pop-tr')).not.toBeEmpty();
    await page.getByTestId('pop-add').click();
    await expect(page.getByTestId('word-popup')).toHaveCount(0);
    g.check();
    expect(calls.every((c) => c.contentType.startsWith('text/plain'))).toBeTruthy();
  });

  test('свой текст: добавление, закладка, упрощение (long не включается), вопросы от ИИ', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await page.goto('./#/reader');
    await page.getByLabel('Название').fill('Мой тест');
    await page.locator('#tx').fill('Zyzzyva quickly crosses the river.\n\nSecond paragraph here.');
    await page.locator('#ta').click();
    await page.getByText('Мой тест').click();
    await page.getByLabel('Закладка').first().click();
    await expect(page.getByLabel('Закладка').first()).toHaveText('🔖');
    await page.getByText('Zyzzyva').click(); // нет в словаре → ИИ
    await expect(page.getByTestId('pop-tr')).toBeVisible();
    await page.getByTestId('pop-close').click();
    await page.locator('#simp').click();
    await expect(page.getByText('Simple version of the text.')).toBeVisible();
    await page.locator('#rq').click();
    await answerQuiz(page, { feedback: true, n: 10 });
    await expect(page.getByTestId('reader-quiz-done')).toBeVisible();
    g.check();
    expect(calls.filter((c) => c.prompt.includes('Rewrite this text')).every((c) => !c.long)).toBeTruthy();
  });

  test('ИИ недоступен: слова нет в словаре → ручной перевод, без падений', async ({ page }) => {
    const g = errorGuard(page);
    await mockAI(page, 'error');
    await onboard(page);
    await page.goto('./#/reader');
    await page.locator('#tx').fill('Zyzzyva is rare.');
    await page.locator('#ta').click();
    await page.getByTestId('text-link').last().click();
    await page.getByText('Zyzzyva').click();
    await page.getByLabel('Свой перевод').fill('тест');
    await page.getByTestId('pop-add').click();
    await expect(page.getByTestId('word-popup')).toHaveCount(0);
    g.check();
  });
});
