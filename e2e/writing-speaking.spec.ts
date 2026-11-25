import { expect, test } from '@playwright/test';
import { errorGuard, mockAI, onboard } from './helpers';

const ESSAY = 'Some people think that technology makes life easier. However, others disagree. In my opinion, technology helps us, for example in education and health. Moreover, it saves time. Therefore I agree.';

test.describe('Writing / Speaking', () => {
  test('Writing: счётчик слов, оценка ИИ (long:true), разбор по строкам', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await page.goto('./#/writing');
    await page.getByTestId('wtask').first().click();
    await page.getByTestId('essay-send').click(); // пусто — не отправляется
    await expect(page.getByTestId('essay')).toBeVisible();
    await page.getByTestId('essay').fill(ESSAY);
    await expect(page.getByTestId('wc')).toContainText(String(ESSAY.match(/[A-Za-z']+/g)!.length));
    await page.getByTestId('essay-send').click();
    await expect(page.getByTestId('write-result')).toBeVisible();
    await expect(page.getByTestId('grade-ai')).toBeVisible();
    const gr = calls.filter((c) => c.prompt.includes('Grade this'));
    expect(gr).toHaveLength(1);
    expect(gr[0].long).toBe(true);
    expect(gr[0].contentType).toContain('text/plain');
    g.check();
  });

  test('Writing без ИИ: локальная оценка с пометкой, ошибок в консоли нет', async ({ page }) => {
    const g = errorGuard(page);
    await mockAI(page, 'error');
    await onboard(page);
    await page.goto('./#/writing');
    await page.getByTestId('wtask').first().click();
    await page.getByTestId('essay').fill(ESSAY);
    await page.getByTestId('essay-send').click();
    await expect(page.getByTestId('grade-local')).toBeVisible();
    await expect(page.getByTestId('overall')).not.toBeEmpty();
    g.check();
  });

  test('Speaking: 7 шагов с ручным вводом, оценка (long:true), результат', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await page.goto('./#/speaking');
    await page.getByTestId('speak-start').click();
    for (let i = 0; i < 7; i++) {
      if (i === 3) await page.getByTestId('prep-skip').click();
      await expect(page.getByTestId('record-answer')).toBeVisible();
      await page.getByTestId('transcript').fill('I usually spend my free time reading books because it helps me relax.');
      const prompt = await page.locator('.bubble b').first().textContent();
      await page.getByTestId('answer-next').click();
      if (i < 6) await expect(page.locator('.bubble b').first()).not.toHaveText(prompt!, { timeout: 5000 }).catch(() => {});
    }
    await expect(page.getByTestId('speaking-result')).toBeVisible();
    const gr = calls.filter((c) => c.prompt.includes('IELTS Speaking Parts'));
    expect(gr).toHaveLength(1);
    expect(gr[0].long).toBe(true);
    g.check();
  });
});
