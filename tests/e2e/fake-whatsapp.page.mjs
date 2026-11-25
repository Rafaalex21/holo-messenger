// Page object do WhatsApp de mentira (tests/fixtures/wa-calls.html) com a extensão.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const probe = path.join(path.dirname(fileURLToPath(import.meta.url)), 'audio-probe.js');

export class FakeWhatsApp {
  constructor(page) {
    this.page = page;
    this.callScreen = page.getByRole('region', { name: 'Tela de ligação' });
  }

  /** @param {{ sound?: 'cyberpunk' | 'silent' | 'whatsapp' }} opts modo de som do popup */
  async open({ sound = 'cyberpunk' } = {}) {
    // o E2E não fala com servidor de terceiro: os arquivos do WhatsApp não descem
    await this.page.route('https://static.whatsapp.net/**', (r) => r.abort());
    await this.page.addInitScript({ path: probe });
    await this.page.goto(`/tests/fixtures/wa-calls.html?holo=1&sound=${sound}`);
    // extensão pronta: o sound.js marca o <html> conforme o modo
    if (sound === 'whatsapp') await this.page.waitForFunction(() => window.HOLO && !document.documentElement.hasAttribute('data-holo-sound'));
    else await this.page.waitForFunction((m) => document.documentElement.getAttribute('data-holo-sound') === m, sound === 'silent' ? 'silent' : 'replace');
  }

  press(name) { return this.page.getByRole('button', { name, exact: true }).click(); }

  receiveMessage() { return this.press('Chega mensagem'); }
  receiveMessageWithNotification() { return this.press('Chega mensagem com notificação'); }
  receiveMessageViaWorker() { return this.press('Chega mensagem pelo service worker'); }
  dial() { return this.press('Ligar'); }
  dialVideo() { return this.press('Ligar por vídeo'); }
  remoteAnswers() { return this.press('Atenderam'); }
  hangUp() { return this.press('Desligar'); }
  someoneCalls() { return this.press('Me ligam'); }
  answer() { return this.press('Atender'); }
  decline() { return this.press('Recusar'); }

  /** o que está soando agora (ver audio-probe.js) */
  hearing() { return this.page.evaluate(() => window.__probe.now()); }
  /** tudo que começou a tocar desde que a página abriu */
  played() { return this.page.evaluate(() => window.__probe.played()); }
  /** notificações do sistema que saíram, com as opções que chegam ao Windows */
  notifications() { return this.page.evaluate(() => window.__probe.notifications()); }
}
