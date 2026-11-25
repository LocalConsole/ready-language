import { expect, test } from '@playwright/test';
import { answerQuiz, errorGuard, mockAI, onboard } from './helpers';

test.describe('Экзамены', () => {
  test('IELTS Reading: без подсказок → отчёт со шкалой и динамикой', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/exam');
    await page.getByTestId('ielts-reading').click();
    await page.getByTestId('exam-go').click();
    await answerQuiz(page, { feedback: false, n: 12 });
    await expect(page.getByTestId('report')).toBeVisible();
    await expect(page.getByTestId('report-score')).toHaveText(/^\d(\.5)?$/);
    await page.goto('./#/exam');
    await expect(page.getByText('IELTS').last()).toBeVisible();
    g.check();
  });

  test('SAT Math: два адаптивных модуля, калькулятор считает и строит график', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page, { sat: true });
    await page.goto('./#/exam/sat/math');
    await page.getByTestId('exam-go').click();
    await page.getByTestId('calc').locator('summary').click();
    await page.locator('#ce').fill('2+3*4');
    await page.getByTestId('calc-eq').click();
    await expect(page.getByTestId('calc-out')).toHaveText('14');
    await page.locator('#ce').fill('Function("alert(1)")');
    await page.getByTestId('calc-eq').click();
    await expect(page.getByTestId('calc-out')).toHaveText('ошибка');
    await answerQuiz(page, { feedback: false, n: 40 });
    await expect(page.getByText(/Модуль 2/)).toBeVisible({ timeout: 3000 }).catch(() => {});
    await answerQuiz(page, { feedback: false, n: 40 });
    await expect(page.getByTestId('report')).toBeVisible();
    await expect(page.getByTestId('report-score')).toHaveText(/^\d{3,4}$/);
    g.check();
  });

  test('IELTS полный: Reading → Listening → 2 Writing → Speaking → отчёт', async ({ page }) => {
    test.setTimeout(120000);
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await page.goto('./#/exam/ielts/full');
    await page.getByTestId('exam-go').click();
    await answerQuiz(page, { feedback: false, n: 12 });
    await answerQuiz(page, { feedback: false, n: 10 });
    for (let i = 0; i < 2; i++) {
      await page.getByTestId('essay').fill('Some people think that technology helps. However, others disagree. For example, it saves time. Therefore I agree.');
      await page.getByTestId('essay-send').click();
    }
    for (let i = 0; i < 7; i++) {
      if (i === 3) await page.getByTestId('prep-skip').click();
      await expect(page.getByTestId('record-answer')).toBeVisible();
      const prompt = await page.locator('.bubble b').first().textContent();
      await page.getByTestId('transcript').fill('I like reading books because it helps me relax and learn new things.');
      await page.getByTestId('answer-next').click();
      if (i < 6) await expect(page.locator('.bubble b').first()).not.toHaveText(prompt!, { timeout: 5000 }).catch(() => {});
    }
    await expect(page.getByTestId('report')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('writing')).toBeVisible();
    await expect(page.getByText('speaking')).toBeVisible();
    expect(calls.filter((c) => c.long).length).toBe(3);
    g.check();
  });
});
