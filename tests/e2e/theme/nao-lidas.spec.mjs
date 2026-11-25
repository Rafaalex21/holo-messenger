// Contador de não lidas (C3): como no jogo, só o número em amarelo logo depois
// do nome; a bolinha do WhatsApp some nessa linha.
//
// Como pode dar errado (e o que cada teste cobre):
//  1. o número não aparece ao lado do nome;
//  2. a bolinha original continua junto → número duas vezes;
//  3. chega outra mensagem (3 → 4) e o número fica velho;
//  4. a conversa é lida e o número fica lá;
//  5. "marcar como não lida" (bolinha sem número) some em vez de virar um ponto;
//  6. o WhatsApp troca o data-testid do contador: o tema tem que deixar a
//     bolinha original visível (nada some, nada duplica).
import { test, expect } from '@playwright/test';

const row = (page, n) => page.locator(`[data-testid="list-item-${n}"]`);
// o número que o tema desenha depois do nome ('' = nada)
const drawn = (page, n) => row(page, n).locator('[data-testid="cell-frame-title"]')
  .evaluate((el) => { const c = getComputedStyle(el, '::after').content; return c === 'none' || c === 'normal' ? '' : c.replace(/^"|"$/g, ''); });
const original = (page, n) => row(page, n).locator('.badge');

test('o número vai para o lado do nome e a bolinha do WhatsApp some', async ({ page }) => {
  await page.goto('/tests/fixtures/wa-list.html?holo=1');

  await expect.poll(() => drawn(page, 1)).toBe('3');
  await expect(original(page, 1)).toBeHidden();
  // sem não lidas: nada
  expect(await drawn(page, 2)).toBe('');
  // marcada como não lida, sem número: um ponto
  await expect.poll(() => drawn(page, 3)).toBe('•');
  await expect(original(page, 3)).toBeHidden();

  await page.getByRole('button', { name: 'Chega outra mensagem na primeira' }).click();
  await expect.poll(() => drawn(page, 1)).toBe('4');

  await page.getByRole('button', { name: 'Ler a primeira' }).click();
  await expect.poll(() => drawn(page, 1)).toBe('');
});

test('se o WhatsApp trocar o contador, a bolinha original continua lá', async ({ page }) => {
  await page.goto('/tests/fixtures/wa-list.html?holo=1&wa=mudou');
  await expect(page.locator('html')).toHaveAttribute('data-holo', '');

  await expect(original(page, 1)).toBeVisible();
  await expect(original(page, 1)).toHaveText('3');
  await expect(original(page, 3)).toBeVisible();
  for (const n of [1, 2, 3]) expect(await drawn(page, n)).toBe('');
});
