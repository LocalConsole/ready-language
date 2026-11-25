import { expect, test } from '@playwright/test';
import { answerQuiz, errorGuard, onboard } from './helpers';

test.describe('Словарь', () => {
  test('5 новых слов → карточки → тест → слова попали в SRS', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/vocab/new');
    for (let i = 0; i < 5; i++) await page.getByTestId('word-next').click();
    await answerQuiz(page, { feedback: true, n: 20 });
    await expect(page.getByTestId('new-done')).toBeVisible();
    await page.goto('./#/vocab');
    await expect(page.getByTestId('due-count')).toContainText(/[0-9]/);
    g.check();
  });

  test('SRS: перевернуть карточку, оценить, серия завершается; «не вспомнил» → завтра', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/vocab/new');
    for (let i = 0; i < 5; i++) await page.getByTestId('word-next').click();
    await answerQuiz(page, { feedback: true, n: 20 });
    await page.goto('./#/vocab/review/any');
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('flashcard').click();
      await expect(page.getByTestId('grade-box')).toBeVisible();
      await page.locator('[data-q="1"]').click();
    }
    await expect(page.getByTestId('srs-done')).toBeVisible();
    // забытые карточки не возвращаются «сегодня же» (баг старой версии)
    await page.waitForTimeout(600);
    const due = await page.evaluate(
      () => new Promise<number>((res) => {
        const r = indexedDB.open('misha-react');
        r.onsuccess = () => {
          const q = r.result.transaction('kv').objectStore('kv').get('progress');
          q.onsuccess = () => {
            const today = new Date(); const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            res(Object.values(q.result.value.cards as Record<string, { due: string; kind: string }>).filter((c) => c.kind === 'word' && c.due <= d).length);
          };
        };
      }),
    );
    expect(due).toBe(0);
    g.check();
  });

  test('режим «Ввод по определению» и поиск по списку слов', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/vocab/mode/type');
    await answerQuiz(page, { feedback: true, n: 12 });
    await expect(page.getByTestId('mode-done')).toBeVisible();
    await page.goto('./#/vocab/list');
    await page.getByRole('textbox').fill('abandon');
    await expect(page.locator('table.tbl tr')).toHaveCount(1);
    g.check();
  });

  test('книги: добавить слова со страницами, домашка, экзамен; спецсимволы не ломают тест', async ({ page }) => {
    const g = errorGuard(page);
    await onboard(page);
    await page.goto('./#/books');
    await page.locator('#bt').fill('#12\nabandon - покидать - to leave completely\n(to) go - идти\ne.g. - например\nacquire - приобретать\n#13\nadequate - достаточный | enough');
    await page.locator('#badd').click();
    await expect(page.getByText('Добавлено слов: 5')).toBeVisible();
    await page.locator('#hf').fill('12');
    await page.locator('#ht').fill('13');
    await page.locator('#hadd').click();
    await expect(page.getByTestId('hw-row')).toHaveCount(1);
    await page.getByTestId('hw-exam').click();
    await answerQuiz(page, { feedback: true, n: 12 });
    await expect(page.getByTestId('hw-result')).toBeVisible();
    g.check();
  });
});
