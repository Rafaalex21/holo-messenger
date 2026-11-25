// Som de mensagem (RF-08): o do jogo no lugar do do WhatsApp, um por rajada.
import { test, expect } from '@playwright/test';
import { FakeWhatsApp } from '../fake-whatsapp.page.mjs';

const count = (list, name) => list.filter((s) => s === name).length;

test('mensagem nova toca o som do jogo, não o do WhatsApp', async ({ page }) => {
  const wa = new FakeWhatsApp(page);
  await wa.open();

  await wa.receiveMessage();
  await expect.poll(() => wa.played()).toContain('cyberpunk:mensagem');
  expect(await wa.played()).not.toContain('whatsapp:mensagem');
});

test('rajada de mensagens (grupo) dá um som só', async ({ page }) => {
  const wa = new FakeWhatsApp(page);
  await wa.open();

  await wa.receiveMessage();
  await wa.receiveMessage();
  await wa.receiveMessage();
  await expect.poll(() => wa.played()).toContain('cyberpunk:mensagem');
  expect(count(await wa.played(), 'cyberpunk:mensagem')).toBe(1);
});
