/*
 * "Ouvido" dos testes E2E: entra antes de qualquer script da página
 * (page.addInitScript) e anota o que de fato chegaria ao alto-falante.
 *
 * - Sons da extensão: AudioBufferSourceNode.start/stop (Web Audio do sound.js)
 *   e o plano reserva do background (window.__holoBgPlays, do stub do servidor).
 * - Sons do WhatsApp: HTMLMediaElement.play/pause no nível mais baixo. Como o
 *   page-hook envolve play() por cima deste, só chega aqui o que ele deixou
 *   passar — ou seja, o que o WhatsApp realmente tocou.
 *
 * window.__probe.now()    → o que está soando agora (loops e áudio da chamada sem mudo)
 * window.__probe.played() → tudo que começou a tocar, em ordem
 */
(() => {
  // duração (s) dos arquivos em assets/sounds → nome usado nos testes
  const OURS = [[1.07, 'cyberpunk:mensagem'], [1.70, 'cyberpunk:ligando'], [3.68, 'cyberpunk:recebendo']];
  const BG = { message: 'cyberpunk:mensagem', 'call-outgoing': 'cyberpunk:ligando', 'call-incoming': 'cyberpunk:recebendo' };
  const WA = [[/BS_BUUXbKq5/, 'whatsapp:mensagem'], [/kAbvQpjkfMK/, 'whatsapp:recebendo'], [/l-ut9G1w4eu/, 'whatsapp:fim']];

  const oursName = (buf) => {
    let best = OURS[0];
    for (const o of OURS) if (Math.abs(o[0] - buf.duration) < Math.abs(best[0] - buf.duration)) best = o;
    return best[1];
  };
  const waName = (el) => {
    if (el.srcObject) return 'whatsapp:chamada';
    const url = el.currentSrc || el.src || '';
    for (const [re, name] of WA) if (re.test(url)) return name;
    return 'whatsapp:?';
  };

  const log = [];
  const sources = new Map(); // AudioBufferSourceNode → nome (tocando)
  const media = new Set();   // HTMLMediaElement tocando

  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function () {
    const name = this.buffer ? oursName(this.buffer) : 'cyberpunk:?';
    sources.set(this, name);
    log.push(name);
    this.addEventListener('ended', () => sources.delete(this));
    return start.apply(this, arguments);
  };
  const stop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.stop = function () {
    sources.delete(this);
    return stop.apply(this, arguments);
  };

  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    media.add(this);
    log.push(waName(this));
    if (!this.__probeWatched) {
      this.__probeWatched = true;
      this.addEventListener('ended', () => media.delete(this));
      this.addEventListener('emptied', () => media.delete(this));
    }
    return play.apply(this, arguments);
  };
  const pause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.pause = function () {
    media.delete(this);
    return pause.apply(this, arguments);
  };

  const bgState = () => {
    const on = new Set();
    for (const entry of window.__holoBgPlays || []) {
      const [kind, action] = entry.split(':');
      if (action === 'play' && kind !== 'message') on.add(BG[kind]);
      else on.delete(BG[kind]);
    }
    return on;
  };

  window.__probe = {
    now() {
      const out = new Set(bgState());
      for (const [src, name] of sources) if (src.loop) out.add(name);
      for (const el of media) if (!el.muted && (el.loop || el.srcObject)) out.add(waName(el));
      return [...out].sort();
    },
    played() {
      const bg = (window.__holoBgPlays || []).filter((e) => e.endsWith(':play')).map((e) => BG[e.split(':')[0]]);
      return [...log, ...bg];
    }
  };
})();
