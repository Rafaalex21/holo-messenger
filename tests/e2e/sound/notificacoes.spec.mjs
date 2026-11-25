// Notificação do sistema (F6.5): com as notificações do WhatsApp ligadas, o
// Windows tocaria o som dele junto com o do jogo. Nos modos CYBERPUNK e MUDO a
// notificação sai com silent: true; no modo WHATSAPP sai como o WhatsApp pediu.
//
// Como pode dar errado (e o que cada teste cobre):
//  1. CYBERPUNK: notificação com som → dois sons juntos;
//  2. MUDO: notificação com som → não fica mudo;
//  3. WHATSAPP: a extensão mexe na notificação mesmo sem trocar nada;
//  4. o embrulho quebra o WhatsApp: permission, requestPermission, new
//     Notification, título ou texto somem;
//  5. notificação pelo service worker escapa do embrulho;
//  6. o WhatsApp pede silent: false e a extensão não cala.
// (o fixture sempre pede silent: false, cobrindo o 6 em todos os modos)
import { test, expect } from '@playwright/test';
import { FakeWhatsApp } from '../fake-whatsapp.page.mjs';

test.use({ permissions: ['notifications'] });

const MODES = [
  ['CYBERPUNK', 'cyberpunk', true],
  ['MUDO', 'silent', true],
  ['WHATSAPP', 'whatsapp', false]
];

for (const [label, mode, quiet] of MODES) {
  test(`${label}: notificação da página e do service worker ${quiet ? 'sai sem som do sistema' : 'sai como o WhatsApp pediu'}`, async ({ page }) => {
    const wa = new FakeWhatsApp(page);
    await wa.open({ sound: mode });

    await wa.receiveMessageWithNotification();
    await wa.receiveMessageViaWorker();

    await expect.poll(() => wa.notifications()).toHaveLength(2);
    const shown = await wa.notifications();
    expect(shown.map((n) => n.via).sort()).toEqual(['pagina', 'worker']);
    for (const n of shown) {
      expect(n).toMatchObject({ title: 'WhatsApp', body: 'Nova mensagem', tag: 'msg-1', silent: quiet });
    }
  });
}

test('a API de notificação continua funcionando para o WhatsApp', async ({ page }) => {
  const wa = new FakeWhatsApp(page);
  await wa.open({ sound: 'cyberpunk' });

  const api = await page.evaluate(async () => {
    const n = new Notification('WhatsApp', { body: 'Nova mensagem' });
    let clicked = false;
    n.onclick = () => { clicked = true; };
    n.dispatchEvent(new Event('click'));
    n.close();
    return {
      permission: Notification.permission,
      asked: await Notification.requestPermission(),
      isNotification: n instanceof Notification,
      title: n.title,
      body: n.body,
      clicked
    };
  });
  expect(api).toEqual({ permission: 'granted', asked: 'granted', isNotification: true, title: 'WhatsApp', body: 'Nova mensagem', clicked: true });
});
