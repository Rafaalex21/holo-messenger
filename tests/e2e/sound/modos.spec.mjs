// Modos do popup (SOM): MUDO cala os toques do WhatsApp sem pôr nada no lugar;
// WHATSAPP deixa tudo original.
import { test, expect } from '@playwright/test';
import { FakeWhatsApp } from '../fake-whatsapp.page.mjs';

const ours = (list) => list.filter((s) => s.startsWith('cyberpunk:'));

test('MUDO: mensagem e ligação recebida sem som; ligação feita mantém o áudio da chamada', async ({ page }) => {
  const wa = new FakeWhatsApp(page);
  await wa.open({ sound: 'silent' });

  await wa.receiveMessage();
  await wa.someoneCalls();
  await wa.decline();
  await wa.dial();
  // o áudio da chamada continua (só os toques são calados)
  await expect.poll(() => wa.hearing()).toEqual(['whatsapp:chamada']);

  const played = await wa.played();
  expect(ours(played)).toEqual([]);
  expect(played).not.toContain('whatsapp:mensagem');
  expect(played).not.toContain('whatsapp:recebendo');
});

test('WHATSAPP: os sons originais tocam e a extensão não toca nada', async ({ page }) => {
  const wa = new FakeWhatsApp(page);
  await wa.open({ sound: 'whatsapp' });

  await wa.receiveMessage();
  await expect.poll(() => wa.played()).toContain('whatsapp:mensagem');

  await wa.someoneCalls();
  await expect.poll(() => wa.hearing()).toEqual(['whatsapp:recebendo']);
  await wa.decline();
  await expect.poll(() => wa.hearing()).toEqual([]);

  await wa.dial();
  await expect.poll(() => wa.hearing()).toEqual(['whatsapp:chamada']);
  expect(ours(await wa.played())).toEqual([]);
});
