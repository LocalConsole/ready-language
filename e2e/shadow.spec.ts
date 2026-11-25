import { expect, test } from '@playwright/test';
import { errorGuard, onboard } from './helpers';

test('диктант и shadowing проходят до конца без ошибок', async ({ page }) => {
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/shadow');
  await page.locator('a[href*="/dict"]').first().click();
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId('shadow-done').isVisible()) break;
    await page.getByTestId('dictation').fill('wrong words here');
    await page.getByTestId('check').click();
    await expect(page.getByTestId('dict-fb')).toBeVisible();
    await page.getByTestId('dict-next').click();
  }
  await expect(page.getByTestId('shadow-done')).toBeVisible();
  await page.goto('./#/shadow');
  await page.locator('a[href*="/shadow/"][href$="/shadow"]').first().click();
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId('shadow-done').isVisible()) break;
    await page.getByTestId('shadow-next').click();
  }
  await expect(page.getByTestId('shadow-done')).toBeVisible();
  g.check();
});
