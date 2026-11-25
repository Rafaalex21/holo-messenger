// Ligações (RF-08b): o toque do jogo no lugar do do WhatsApp, e o áudio da
// chamada de volta assim que alguém atende. Roteiros iguais aos da inspeção v3.
import { test, expect } from '@playwright/test';
import { FakeWhatsApp } from '../fake-whatsapp.page.mjs';

const ours = (list) => list.filter((s) => s.startsWith('cyberpunk:'));

test.describe('Ligação feita', () => {
  test('enquanto chama toca o "ligando" do jogo; quando atendem volta o áudio da chamada', async ({ page }) => {
    const wa = new FakeWhatsApp(page);
    await wa.open();

    await wa.dial();
    await expect.poll(() => wa.hearing()).toEqual(['cyberpunk:ligando']); // o tu… tu… do WhatsApp fica mudo

    await wa.remoteAnswers();
    await expect.poll(() => wa.hearing()).toEqual(['whatsapp:chamada']); // dá para ouvir a pessoa

    await wa.hangUp();
    await expect.poll(() => wa.hearing()).toEqual([]);
    expect(await wa.played()).toContain('whatsapp:fim'); // bipe de fim fica o original
  });

  test('desligar antes de atenderem para o toque', async ({ page }) => {
    const wa = new FakeWhatsApp(page);
    await wa.open();

    await wa.dial();
    await expect.poll(() => wa.hearing()).toEqual(['cyberpunk:ligando']);
    await wa.hangUp();
    await expect.poll(() => wa.hearing()).toEqual([]);
  });

  test('videochamada fica como o WhatsApp faz', async ({ page }) => {
    const wa = new FakeWhatsApp(page);
    await wa.open();

    await wa.dialVideo();
    await expect.poll(() => wa.hearing()).toEqual(['whatsapp:chamada']);
    expect(ours(await wa.played())).toEqual([]);
  });
});

test.describe('Ligação recebida', () => {
  test('toca o "recebendo" do jogo; ao atender para e entra o áudio da chamada', async ({ page }) => {
    const wa = new FakeWhatsApp(page);
    await wa.open();

    await wa.someoneCalls();
    await expect.poll(() => wa.hearing()).toEqual(['cyberpunk:recebendo']);

    await wa.answer();
    await expect.poll(() => wa.hearing()).toEqual(['whatsapp:chamada']);
    // atender não pode ser confundido com "estou ligando"
    expect(await wa.played()).not.toContain('cyberpunk:ligando');
    expect(await wa.played()).not.toContain('whatsapp:recebendo');
  });

  test('recusar para o toque', async ({ page }) => {
    const wa = new FakeWhatsApp(page);
    await wa.open();

    await wa.someoneCalls();
    await expect.poll(() => wa.hearing()).toEqual(['cyberpunk:recebendo']);
    await wa.decline();
    await expect.poll(() => wa.hearing()).toEqual([]);
  });
});
