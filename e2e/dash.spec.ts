import { expect, test } from '@playwright/test';
import { errorGuard, onboard } from './helpers';

test('прогресс: пустое состояние и после урока, без ошибок', async ({ page }) => {
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/dash');
  await expect(page.getByText('Частые ошибки')).toBeVisible();
  await expect(page.getByTestId('fc-ielts')).toContainText('≥2');
  await expect(page.locator('.heat i')).not.toHaveCount(0);
  g.check();
});
