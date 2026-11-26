// C15/C16: rodapé CALL / CLOSE e botão enviar em qualquer idioma do WhatsApp.
// Os botões do WhatsApp são achados pelo nome interno do ícone
// (<svg><title>ic-call</title>), igual em qualquer idioma; o rótulo em
// português/inglês fica de reserva.
//
// Como pode dar errado:
//  1. CALL não liga num idioma sem rótulo conhecido (italiano), ou liga por
//     vídeo em vez de voz;
//  2. CLOSE não fecha quando o Esc não fecha e o menu está em outro idioma;
//  3. CLOSE clica no item errado do menu ("Apagar conversa", "Limpar
//     conversa"): o pior caso, apaga coisa do usuário;
//  4. o WhatsApp renomeia os ícones e o rótulo em português deixa de servir
//     de reserva;
//  5. o botão enviar fica sem o amarelo num idioma sem "send" no rótulo, ou o
//     microfone fica amarelo no lugar dele.
import { test, expect } from '@playwright/test';

const open = async (page, params) => {
  await page.goto(`/tests/fixtures/wa-conversa.html?holo=1&${params}`);
  await expect(page.locator('[data-holo-action="call"]')).toBeVisible();
};
const wa = (page) => page.evaluate(() => window.__wa);

for (const lang of ['pt', 'en', 'it']) {
  test(`CALL liga por voz com o WhatsApp em ${lang}`, async ({ page }) => {
    await open(page, `wa-lang=${lang}`);
    await page.locator('[data-holo-action="call"]').click();
    // 1
    await expect.poll(async () => (await wa(page)).calls).toEqual(['voice']);
  });

  test(`CLOSE fecha pelo menu com o WhatsApp em ${lang}, sem tocar em outro item`, async ({ page }) => {
    await open(page, `wa-lang=${lang}&esc=0`);
    await page.locator('[data-holo-action="close"]').click();
    // 2
    await expect(page.locator('#main')).toHaveCount(0);
    // 3
    expect((await wa(page)).menu).toEqual(['close']);
  });

  test(`botão enviar em amarelo com o WhatsApp em ${lang}`, async ({ page }) => {
    await open(page, `wa-lang=${lang}`);
    const color = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).color);
    const warn = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--holo-warn)';
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    // 5: o microfone não é o enviar
    expect(await color('#mic')).not.toBe(warn);
    await page.getByRole('textbox').pressSequentially('lorem');
    await expect(page.locator('#send')).toBeVisible();
    await expect.poll(() => color('#send')).toBe(warn);
  });
}

test('CLOSE pelo Esc quando o WhatsApp fecha com ele, sem abrir o menu', async ({ page }) => {
  await open(page, 'wa-lang=it');
  await page.locator('[data-holo-action="close"]').click();
  await expect(page.locator('#main')).toHaveCount(0);
  expect((await wa(page)).menu).toEqual([]);
});

test('sem os nomes de ícone, o rótulo em português ainda serve (CALL e CLOSE)', async ({ page }) => {
  // 4
  await open(page, 'wa-lang=pt&icons=0&esc=0');
  await page.locator('[data-holo-action="call"]').click();
  await expect.poll(async () => (await wa(page)).calls).toEqual(['voice']);
  await page.locator('[data-holo-action="close"]').click();
  await expect(page.locator('#main')).toHaveCount(0);
  expect((await wa(page)).menu).toEqual(['close']);
});
