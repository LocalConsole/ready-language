import { expect, test } from '@playwright/test';
import { errorGuard, onboard } from './helpers';

const ROUTES = ['home', 'path', 'practice', 'vocab', 'books', 'reader', 'journal', 'writing', 'speaking', 'shadow', 'exam', 'dash', 'me', 'settings', 'sources'];

test('@mobile нет горизонтального скролла на основных экранах (светлая и тёмная тема)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'только mobile-проект');
  test.setTimeout(120000);
  const g = errorGuard(page);
  await onboard(page);
  for (const theme of ['light', 'dark']) {
    await page.goto('./#/settings');
    await page.locator('#th').selectOption(theme);
    for (const r of ROUTES) {
      await page.goto('./#/' + r);
      await page.waitForTimeout(150);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect.soft(over, `${theme} ${r}`).toBeLessThanOrEqual(1);
    }
  }
  await expect(page.locator('.bottomnav, nav').last()).toBeVisible();
  g.check();
});

test('@mobile урок и тест проходятся на узком экране', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'только mobile-проект');
  const g = errorGuard(page);
  await onboard(page);
  await page.goto('./#/vocab/mode/choice');
  await expect(page.locator('.opt').first()).toBeVisible();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
  g.check();
});

test.describe('PWA', () => {
  test.use({ serviceWorkers: 'allow' });
  test('манифест валиден, service worker ставится, офлайн открывается оболочка и прогресс', async ({ page, context, isMobile }) => {
    test.skip(!!isMobile, 'только desktop-проект');
    test.setTimeout(90000);
    const g = errorGuard(page);
    const res = await page.request.get('./manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const m = await res.json();
    expect(m.start_url).toContain('/ready-language/');
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBeTruthy();
    await onboard(page);
    await page.waitForTimeout(600); // запись прогресса в IndexedDB (debounce)
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    // ждём, пока workbox закончит precache (иначе ленивые чанки ещё не в кэше)
    await page.waitForFunction(async () => {
      const names = (await caches.keys()).filter((n) => /precache/.test(n));
      if (!names.length) return false;
      return (await (await caches.open(names[0])).keys()).length >= 45;
    }, null, { timeout: 30000 });
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
    await page.goto('./#/vocab');
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await page.goto('./#/dash');
    await expect(page.getByText('Прогноз IELTS')).toBeVisible();
    await context.setOffline(false);
    g.check();
  });
});
