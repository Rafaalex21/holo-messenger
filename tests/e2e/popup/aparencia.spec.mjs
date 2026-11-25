// Popup (F5.2, F7.3): paleta e efeitos mudam a aba do WhatsApp na hora, sem
// recarregar, e o popup lembra o que foi escolhido.
//
// Popup e WhatsApp de mentira abrem no mesmo contexto e na mesma origem; o
// storage de mentira do serve-fixtures fica no localStorage e avisa a outra
// página pelo evento 'storage', no papel do storage.onChanged da extensão.
import { test, expect } from '@playwright/test';

const POPUP = '/src/popup/popup.html?stub=1';
const CHAT = '/tests/fixtures/wa-chat.html?holo=1';

async function openBoth(context) {
  const chat = await context.newPage();
  await chat.goto(CHAT);
  await expect(chat.locator('[data-holo-bubble]')).toHaveCount(6);
  const popup = await context.newPage();
  await popup.goto(POPUP);
  return { chat, popup };
}

// o que a pessoa vê: a cor da moldura do balão enviado
const sentFrameColor = (chat) => chat.locator('[data-holo-bubble="out"]').first()
  .evaluate((el) => getComputedStyle(el, '::after').backgroundColor);
// a camada de scanlines por cima da tela
const scanlines = (chat) => chat.evaluate(() => getComputedStyle(document.body, '::after').content);
// o brilho em volta dos balões
const bubbleGlow = (chat) => chat.locator('[data-holo-dir="out"]').first().evaluate((el) => getComputedStyle(el).filter);

test('trocar a paleta muda os balões enviados na aba do WhatsApp na hora', async ({ context }) => {
  const { chat, popup } = await openBoth(context);
  const yellow = await sentFrameColor(chat);

  await expect(popup.getByRole('radio', { name: 'AMARELO' })).toBeChecked();
  await popup.getByRole('radio', { name: 'VERDE-ÁGUA' }).check();

  await expect.poll(() => sentFrameColor(chat)).not.toBe(yellow);
  await expect(chat.locator('html')).toHaveAttribute('data-holo-palette', 'teal');

  // o popup reabre com a escolha salva
  await popup.reload();
  await expect(popup.getByRole('radio', { name: 'VERDE-ÁGUA' })).toBeChecked();

  // e volta
  await popup.getByRole('radio', { name: 'AMARELO' }).check();
  await expect.poll(() => sentFrameColor(chat)).toBe(yellow);
});

test('scanlines, brilho e glitch ligam e desligam pelo popup', async ({ context }) => {
  const { chat, popup } = await openBoth(context);
  const scan = popup.getByRole('checkbox', { name: 'SCANLINES' });
  const glow = popup.getByRole('checkbox', { name: 'BRILHO' });
  const glitch = popup.getByRole('checkbox', { name: 'GLITCH' });

  for (const box of [scan, glow, glitch]) await expect(box).toBeChecked();
  expect(await scanlines(chat)).not.toBe('none');
  expect(await bubbleGlow(chat)).not.toBe('none');

  await scan.uncheck();
  await expect.poll(() => scanlines(chat)).toBe('none');

  await glow.uncheck();
  await expect.poll(() => bubbleGlow(chat)).toBe('none');

  await glitch.uncheck();
  await expect.poll(() => chat.locator('html').getAttribute('data-holo-fx')).toBe('');

  // o popup reabre com tudo desligado
  await popup.reload();
  for (const box of [scan, glow, glitch]) await expect(box).not.toBeChecked();

  await scan.check();
  await glow.check();
  await expect.poll(() => scanlines(chat)).not.toBe('none');
  await expect.poll(() => bubbleGlow(chat)).not.toBe('none');
});
