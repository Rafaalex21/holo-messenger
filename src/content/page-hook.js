/*
 * Gancho de som (mundo MAIN, document_start) — spec §8.2, plano A; F6.1.
 *
 * Roda no contexto da página, antes do código do WhatsApp, e envolve
 * HTMLMediaElement.prototype.play/pause. Quando o WhatsApp vai tocar um dos
 * sons que a extensão substitui, o original NÃO toca (play devolve uma
 * Promise resolvida) e o content script é avisado por um evento:
 *
 *   window 'holo:sound'  detail = "<tipo>:<play|stop>"   (string: atravessa os mundos sem Xray)
 *
 * Tipos: message (toque de mensagem) e, depois da inspeção de ligações
 * (F6.0), call-outgoing / call-incoming. Toques de ligação espelham o ciclo
 * de vida do original: play → "play"; pause, ended ou troca de src → "stop".
 *
 * Só age se o <html> tiver data-holo-sound (o content script põe conforme o
 * modo escolhido). Sem o atributo, tudo passa direto: o WhatsApp toca o dele.
 * Não lê nada da conversa: só a URL do arquivo de áudio e a pilha de chamadas.
 */
(() => {
  const root = document.documentElement;
  const WA_SOUND = /^https:\/\/static\.whatsapp\.net\/rsrc\.php\/.+\.(mp3|ogg|m4a)$/;

  // Arquivos conhecidos (docs/sound-investigation.md). O hash muda em deploys
  // do WhatsApp; por isso há um plano B pela pilha (os dois toques saem da
  // mesma função playSound): em loop = ligação recebida, sem loop = mensagem.
  const SOUNDS = [
    { kind: 'message', file: /\/BS_BUUXbKq5\.mp3$/, loop: false },
    { kind: 'call-incoming', file: /\/kAbvQpjkfMK\.ogg$/, loop: true }
    // ligação feita: o "tu… tu…" vem dentro do áudio da própria chamada
    // (WebRTC), não de um arquivo — ver docs/sound-investigation.md §Ligações
  ];

  const classify = (el) => {
    if (!(el instanceof HTMLAudioElement)) return null;
    const url = el.currentSrc || el.src || '';
    if (!WA_SOUND.test(url)) return null;
    for (const s of SOUNDS) if (s.file.test(url)) return s;
    // plano B: hash novo, fora do DOM, tocado por playSound
    if (!el.isConnected && /playSound/.test(new Error().stack || '')) return el.loop ? SOUNDS[1] : SOUNDS[0];
    return null;
  };

  const emit = (kind, action) => window.dispatchEvent(new CustomEvent('holo:sound', { detail: `${kind}:${action}` }));
  const active = new WeakMap(); // elemento → tipo, para toques em loop

  const stopIfActive = (el) => {
    const kind = active.get(el);
    if (!kind) return;
    active.delete(el);
    emit(kind, 'stop');
  };

  // diagnóstico: som do WhatsApp que tocou sem ser reconhecido (só o nome do arquivo)
  const unknown = (el) => {
    if (!(el instanceof HTMLAudioElement)) return;
    const url = el.currentSrc || el.src || '';
    if (WA_SOUND.test(url)) window.dispatchEvent(new CustomEvent('holo:sound-seen', { detail: url.split('/').pop() + (el.loop ? ' (loop)' : '') }));
  };

  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const s = root.hasAttribute('data-holo-sound') ? classify(this) : null;
    if (!s) { unknown(this); return play.apply(this, arguments); }
    if (s.loop) {
      if (active.has(this)) return Promise.resolve();
      active.set(this, s.kind);
      if (!this.__holoWatched) {
        this.__holoWatched = true;
        this.addEventListener('ended', () => stopIfActive(this));
        this.addEventListener('emptied', () => stopIfActive(this)); // src trocado/limpo
      }
    }
    emit(s.kind, 'play');
    return Promise.resolve(); // o original não toca
  };

  const pause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.pause = function () {
    stopIfActive(this);
    return pause.apply(this, arguments);
  };
})();
