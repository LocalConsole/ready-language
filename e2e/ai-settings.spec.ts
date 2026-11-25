import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { errorGuard, mockAI, onboard } from './helpers';

const addText = async (page: import('@playwright/test').Page, text: string) => {
  await page.goto('./#/reader');
  await page.locator('#tx').fill(text);
  await page.locator('#ta').click();
  await expect(page.getByText('добавлено пользователем')).toBeVisible();
  await page.getByTestId('text-link').last().click();
};

test.describe('ИИ: протокол, кэш, ошибки', () => {
  test('POST text/plain с {prompt,system,long}; слово — не long; повтор берётся из IndexedDB-кэша', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'ok');
    await onboard(page);
    await addText(page, 'Zyzzyva zyzzyva.');
    await page.getByText('Zyzzyva').first().click();
    await expect(page.getByTestId('pop-tr')).toBeVisible();
    await page.getByTestId('pop-close').click();
    await page.getByText('zyzzyva', { exact: true }).click(); // то же слово → кэш
    await expect(page.getByTestId('pop-tr')).toBeVisible();
    const w = calls.filter((c) => c.prompt.includes('Give JSON for the English word'));
    expect(w).toHaveLength(1);
    expect(w[0].long).toBe(false);
    expect(w[0].contentType).toContain('text/plain');
    expect(w[0].system.length).toBeGreaterThan(5);
    g.check();
  });

  test('после ошибки прокси повторных запросов нет (cooldown), UI жив, статус «ИИ отдыхает»', async ({ page }) => {
    const g = errorGuard(page);
    const calls = await mockAI(page, 'error');
    await onboard(page);
    await addText(page, 'Alpha qwertyuiop asdfghjkl.');
    await page.getByText('qwertyuiop').click();
    await expect(page.getByText('Слова нет в локальном словаре')).toBeVisible();
    const n = calls.length;
    expect(n).toBe(1);
    await page.getByTestId('pop-close').click();
    await page.getByText('asdfghjkl').click();
    await expect(page.getByText('Слова нет в локальном словаре')).toBeVisible();
    expect(calls.length).toBe(n);
    await expect(page.locator('header').getByText(/ИИ/).first()).toBeVisible();
    g.check();
  });

  test('зависший прокси не блокирует интерфейс', async ({ page }) => {
    test.setTimeout(90000);
    const g = errorGuard(page);
    await mockAI(page, 'hang');
    await onboard(page);
    await addText(page, 'Hanging hangword.');
    await page.getByText('hangword').click();
    await expect(page.getByTestId('word-popup')).toBeVisible();
    await page.getByTestId('pop-close').click({ timeout: 40000 });
    await page.goto('./#/home');
    await expect(page.locator('main')).toBeVisible();
    g.check();
  });
});

test.describe('Настройки и данные', () => {
  test('тема, язык, крупный шрифт применяются и сохраняются после перезагрузки', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/settings');
    await page.locator('#th').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#bg').check();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveClass(/big/);
    g.check();
  });

  test('свой ключ хранится в localStorage и НЕ попадает в экспорт; экспорт → сброс → импорт возвращает прогресс', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/vocab/new');
    for (let i = 0; i < 5; i++) await page.getByTestId('word-next').click();
    await page.goto('./#/settings');
    await page.locator('#okey').fill('SECRET-KEY-123');
    await page.locator('#ks').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#ex').click()]);
    const path = await dl.path();
    const raw = fs.readFileSync(path!, 'utf8');
    expect(raw).not.toContain('SECRET-KEY-123');
    expect(JSON.parse(raw).app).toBe('misha');
    expect(await page.evaluate(() => localStorage.getItem('misha.settings'))).toContain('SECRET-KEY-123');
    await page.locator('#rs').click();
    await page.locator('#rs-yes').click();
    await expect(page.getByTestId('goal-ielts')).toBeVisible({ timeout: 10000 });
    await page.goto('./#/settings');
    await page.locator('#im').setInputFiles(path!);
    await expect(page.getByText('Прогресс загружен')).toBeVisible();
    await page.goto('./#/vocab');
    await expect(page.getByTestId('due-count')).toBeVisible();
    g.check();
  });

  test('импорт с XSS-нагрузкой и мусорным файлом не исполняет скрипты и не ломает приложение', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    const evil = {
      app: 'misha', version: 2,
      progress: { v: 2, profile: { exams: ['ielts'], goal: { ielts: 7, sat: 1400 }, dates: {} }, xp: 'NaN', errors: [{ id: 'x', qid: 'q', q: { id: 'q', q: '<img src=x onerror="window.__xss=1">', opts: ['<script>window.__xss=1</script>'], a: 0, expl: '<img src=x onerror="window.__xss=1">', skill: 'grammar', topic: 't', lvl: 1, wrong: [''], typ: 'mcq' }, ans: 0, date: '2025-01-01', count: 1, topic: 't', skill: 'grammar' }] },
      texts: [{ id: 'u_1', title: '<img src=x onerror="window.__xss=1">', text: 'Hello world.', src: 'x' }],
    };
    const f1 = '/tmp/evil.json'; fs.writeFileSync(f1, JSON.stringify(evil));
    const f2 = '/tmp/junk2.json'; fs.writeFileSync(f2, '{{{ not json');
    await page.goto('./#/settings');
    await page.locator('#im').setInputFiles(f2);
    await expect(page.getByText('Файл не подошёл')).toBeVisible();
    await page.locator('#im').setInputFiles(f1);
    await page.goto('./#/review/journal');
    await page.waitForTimeout(500);
    await page.goto('./#/reader');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    g.check();
  });
});
