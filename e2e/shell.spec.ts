import { expect, test } from '@playwright/test';
import { errorGuard, mockAI, onboard } from './helpers';

test.describe('Каркас и онбординг', () => {
  test('онбординг → главная, без ошибок в консоли', async ({ page }) => {
    const g = errorGuard(page);
    await mockAI(page);
    await onboard(page, { sat: true });
    await expect(page).toHaveURL(/#\/home/);
    await expect(page.getByRole('heading', { name: 'Миссия дня' })).toBeVisible();
    await expect(page.locator('.node.wide')).toHaveCount(3);
    g.check();
  });

  test('без профиля любой маршрут ведёт на старт; неизвестный маршрут — на главную', async ({ page }) => {
    await page.goto('./#/path');
    await expect(page).toHaveURL(/#\/start/);
    await onboard(page);
    await page.goto('./#/no-such-page');
    await expect(page).toHaveURL(/#\/home/);
  });

  test('skip-link не ломает маршрут (баг старой версии)', async ({ page }) => {
    await onboard(page);
    await page.goto('./#/settings');
    await page.locator('a.sr').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/settings/);
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  });

  test('прогресс сохраняется в IndexedDB и переживает перезагрузку', async ({ page }) => {
    await onboard(page);
    await expect(page).toHaveURL(/#\/home/);
    await page.waitForTimeout(700);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Миссия дня' })).toBeVisible();
    const has = await page.evaluate(
      () =>
        new Promise<boolean>((res) => {
          const r = indexedDB.open('misha-react');
          r.onsuccess = () => {
            const q = r.result.transaction('kv').objectStore('kv').get('progress');
            q.onsuccess = () => res(!!q.result?.value?.profile);
          };
        }),
    );
    expect(has).toBe(true);
    const ls = await page.evaluate(() => localStorage.getItem('misha.state'));
    expect(ls).toBeNull();
  });
});
