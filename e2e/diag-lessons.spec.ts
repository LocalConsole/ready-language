import { expect, test } from '@playwright/test';
import { answerQuiz, errorGuard, mockAI, onboard } from './helpers';

test('диагностика: все этапы → карта сильных и слабых сторон', async ({ page }) => {
  const g = errorGuard(page);
  await mockAI(page);
  await onboard(page, { sat: true, diag: true });
  await expect(page).toHaveURL(/#\/diag/);
  await page.getByTestId('diag-start').click();
  await answerQuiz(page, { pick: 1, n: 80 });
  await expect(page.getByTestId('diag-result')).toBeVisible();
  await expect(page.getByTestId('diag-result')).toContainText('IELTS ≈');
  await expect(page.getByTestId('diag-result')).toContainText('SAT ≈');
  g.check();
});

test('карта пути и прохождение урока с разбором и началом XP', async ({ page }) => {
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/path');
  await expect(page.getByTestId('lesson-gr1')).toBeVisible();
  await page.getByTestId('lesson-gr1').click();
  await page.getByTestId('lesson-next').click(); // объяснение
  await page.getByTestId('lesson-next').click(); // пример
  await answerQuiz(page, { pick: 0, feedback: true, n: 40 });
  await expect(page.getByTestId('lesson-done')).toBeVisible();
  await page.goto('./#/path');
  await expect(page.getByTestId('lesson-gr1')).toContainText('%');
  await expect(page.locator('#hdr-xp')).not.toHaveText('0');
  g.check();
});

test('урок «Слова»: карточки → тест → SRS', async ({ page }) => {
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/lesson/v1');
  await page.getByTestId('lesson-next').click();
  await page.getByTestId('lesson-next').click();
  for (let i = 0; i < 5; i++) await page.getByTestId('word-next').click();
  await answerQuiz(page, { feedback: true, n: 40 });
  await expect(page.getByTestId('lesson-done')).toBeVisible();
  g.check();
});
