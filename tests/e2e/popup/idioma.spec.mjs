// Idioma do popup e dos botões que o tema põe no WhatsApp (_locales/).
// O Firefox escolhe pela língua da interface dele; aqui ?lang= faz o papel
// dela (scripts/serve-fixtures.mjs monta o browser.i18n com os mesmos
// _locales/*/messages.json e a mesma regra de reserva: língua → en).
//
// Como pode dar errado:
//  1. o popup continua em português num Firefox em inglês;
//  2. sobra texto sem tradução, ou um rótulo fica vazio porque a chave falta
//     num dos idiomas;
//  3. num idioma sem tradução (alemão) o popup fica em branco em vez de cair
//     no inglês;
//  4. os botões CALL / CLOSE no WhatsApp ficam com a descrição em português;
//  5. o português muda sem querer.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const load = (l) => JSON.parse(readFileSync(new URL(`../../../_locales/${l}/messages.json`, import.meta.url), 'utf8'));
const PT = load('pt_BR');
const EN = load('en');
const text = (m, k) => m[k].message;

// texto de cada elemento marcado com data-i18n (e data-i18n-aria)
const marked = (page) => page.evaluate(() => [
  ...[...document.querySelectorAll('[data-i18n]')].map((el) => ({ key: el.dataset.i18n, got: el.textContent })),
  ...[...document.querySelectorAll('[data-i18n-aria]')].map((el) => ({ key: el.dataset.i18nAria, got: el.getAttribute('aria-label') }))
]);

for (const [lang, messages, htmlLang] of [['en', EN, 'en'], ['de', EN, 'en'], ['pt_BR', PT, 'pt-BR']]) {
  test(`popup com o Firefox em ${lang}`, async ({ page }) => {
    await page.goto(`/src/popup/popup.html?stub=1&lang=${lang}`);
    const found = await marked(page);
    expect(found.length).toBeGreaterThan(15);
    // 1, 2, 3, 5: cada rótulo é o texto do idioma certo, nenhum vazio
    expect(found.filter((f) => f.got !== text(messages, f.key))).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('lang', htmlLang);
  });
}

test('em inglês o popup continua funcionando pelos rótulos novos', async ({ page }) => {
  await page.goto('/src/popup/popup.html?stub=1&lang=en');
  await page.getByRole('radio', { name: 'TEAL' }).check();
  await expect(page.getByRole('radio', { name: 'TEAL' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'THEME' })).toBeChecked();
  await expect(page.getByRole('radiogroup', { name: 'Sound' })).toBeVisible();
});

test('botões CALL / CLOSE no WhatsApp com a descrição em inglês', async ({ page }) => {
  // 4
  await page.goto('/tests/fixtures/wa-conversa.html?holo=1&lang=en');
  await expect(page.getByRole('button', { name: text(EN, 'callAria') })).toBeVisible();
  await expect(page.getByRole('button', { name: text(EN, 'closeAria') })).toBeVisible();
});

test('botões CALL / CLOSE no WhatsApp com a descrição em português', async ({ page }) => {
  // 5
  await page.goto('/tests/fixtures/wa-conversa.html?holo=1');
  await expect(page.getByRole('button', { name: text(PT, 'callAria') })).toBeVisible();
  await expect(page.getByRole('button', { name: text(PT, 'closeAria') })).toBeVisible();
});
