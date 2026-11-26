// F9.1: print do tema inteiro nas páginas de mentira, comparado com a
// referência guardada em telas.spec.mjs-snapshots/ (atualizar de propósito com
// `npx playwright test telas --update-snapshots` e olhar as imagens novas).
//
// Como o visual pode quebrar sem nenhum outro teste ver:
//  1. uma mudança no CSS estraga cor, borda ou espaçamento de uma área que
//     nenhum teste mede (conversa, lista de conversas, popup);
//  2. a fonte do tema não carrega e cai na fonte do sistema;
//  3. a paleta verde-água deixa de pintar alguma parte;
//  4. desligar o tema deixa sobra (rodapé injetado, cor, borda) em vez de
//     devolver o WhatsApp original pixel a pixel.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 900, height: 760 } });

// tema pronto: balões marcados, fontes da extensão carregadas, moldura no pixel
async function openThemed(page, url, bubbles) {
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-holo', '');
  if (bubbles) await expect(page.locator('[data-holo-bubble]')).toHaveCount(bubbles);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
  });
}

for (const palette of ['yellow', 'teal']) {
  test(`conversa na paleta ${palette === 'yellow' ? 'amarela' : 'verde-água'}`, async ({ page }) => {
    await openThemed(page, `/tests/fixtures/wa-chat.html?holo=1&palette=${palette}`, 6);
    // 2: a fonte do tema está em uso (sem ela o print também muda, mas assim o erro diz o porquê)
    // (o Firefox só baixa os pesos em uso: confere que alguma carregou e nenhuma falhou)
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.family.includes('Holo')).map((f) => f.status));
    expect(fonts).toContain('loaded');
    expect(fonts).not.toContain('error');
    await expect(page).toHaveScreenshot(`conversa-${palette}.png`);
  });
}

test('lista de conversas com o contador de não lidas', async ({ page }) => {
  await openThemed(page, '/tests/fixtures/wa-list.html?holo=1');
  await expect(page.locator('[data-holo-unread]')).toHaveCount(2);
  await expect(page.locator('#side')).toHaveScreenshot('lista.png');
});

test('popup', async ({ page }) => {
  await page.setViewportSize({ width: 260, height: 600 });
  await page.goto('/src/popup/popup.html?stub=1');
  await expect(page.getByRole('radio', { name: 'AMARELO' })).toBeChecked();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('popup.png', { fullPage: true });
});

test('desligar o tema no popup devolve a conversa original, pixel a pixel', async ({ context }) => {
  // referência: a mesma conversa sem a extensão
  const plain = await context.newPage();
  await plain.goto('/tests/fixtures/wa-chat.html');
  const original = await plain.screenshot();
  await plain.close();

  const chat = await context.newPage();
  await openThemed(chat, '/tests/fixtures/wa-chat.html?holo=1', 6);
  expect(await chat.screenshot()).not.toEqual(original); // o tema estava aplicado

  const popup = await context.newPage();
  await popup.goto('/src/popup/popup.html?stub=1');
  await popup.getByRole('checkbox', { name: 'TEMA' }).uncheck();

  await expect(chat.locator('html')).not.toHaveAttribute('data-holo', '');
  await expect.poll(async () => (await chat.screenshot()).equals(original)).toBe(true);
});
