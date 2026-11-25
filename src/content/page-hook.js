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
 * Tipos: message, call-incoming e call-outgoing. Toques de ligação espelham o
 * ciclo de vida do original: play → "play"; pause, ended ou troca de src → "stop".
 *
 * Ligação feita (call-outgoing) é diferente: o "tu… tu…" não é um arquivo,
 * vem no próprio áudio da chamada (WebRTC, elemento com srcObject). Enquanto
 * a tela de ligação de voz está aberta e ainda não há cronômetro (ninguém
 * atendeu), esse elemento fica mudo e o nosso toque roda em loop. Quando
 * atendem (aparece o cronômetro), desligam, ou o elemento para, o som da
 * chamada volta como estava. Ver docs/sound-investigation.md §Ligações.
 *
 * Só age se o <html> tiver data-holo-sound (o content script põe conforme o
 * modo escolhido). Sem o atributo, tudo passa direto: o WhatsApp toca o dele.
 * Não lê nada da conversa: só a URL do arquivo de áudio, a pilha de chamadas
 * e a presença de elementos da tela de ligação (data-testid), nunca texto.
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
  ];
  // conhecidos e deixados como estão (não aparecem no diagnóstico)
  const PASS = /\/l-ut9G1w4eu\.ogg$/; // bipe de fim de ligação

  const classify = (el) => {
    if (!(el instanceof HTMLAudioElement)) return null;
    const url = el.currentSrc || el.src || '';
    if (!WA_SOUND.test(url)) return null;
    for (const s of SOUNDS) if (s.file.test(url)) return s;
    if (PASS.test(url)) return null;
    // plano B: hash novo, fora do DOM, tocado por playSound
    if (!el.isConnected && /playSound/.test(new Error().stack || '')) return el.loop ? SOUNDS[1] : SOUNDS[0];
    return null;
  };

  const emit = (kind, action) => window.dispatchEvent(new CustomEvent('holo:sound', { detail: `${kind}:${action}` }));
  const active = new WeakMap(); // elemento → tipo, para toques em loop
  let lastIncoming = -Infinity; // última vez que o toque de ligação recebida tocou ou parou
  let loops = 0; // toques em loop tocando agora

  const stopIfActive = (el) => {
    const kind = active.get(el);
    if (!kind) return;
    active.delete(el);
    loops--;
    if (kind === 'call-incoming') lastIncoming = performance.now();
    emit(kind, 'stop');
  };

  // diagnóstico: som do WhatsApp que tocou sem ser reconhecido (só o nome do arquivo)
  const unknown = (el) => {
    if (!(el instanceof HTMLAudioElement)) return;
    const url = el.currentSrc || el.src || '';
    if (WA_SOUND.test(url) && !PASS.test(url)) window.dispatchEvent(new CustomEvent('holo:sound-seen', { detail: url.split('/').pop() + (el.loop ? ' (loop)' : '') }));
  };

  // ---- ligação feita: troca o "tu… tu…" que vem no áudio da chamada ----
  const CALL_SCREEN = '[data-testid="voip-container-audio-call"]'; // só voz; vídeo fica intacto
  const ANSWERED = '[data-testid="voip-call-timer"]';
  const MAX_RING_MS = 70000; // trava de segurança: nunca deixa a chamada muda por mais que isso

  let ring = null; // { el, wasMuted, observer, timer }

  const endRing = () => {
    if (!ring) return;
    const { el, wasMuted, observer, timer } = ring;
    ring = null;
    observer.disconnect();
    clearTimeout(timer);
    el.muted = wasMuted;
    emit('call-outgoing', 'stop');
  };

  const ringing = () => !!document.querySelector(CALL_SCREEN) && !document.querySelector(ANSWERED);

  const maybeRing = (el) => {
    if (ring || root.getAttribute('data-holo-sound') !== 'replace') return;
    if (!(el instanceof HTMLAudioElement) || !el.srcObject) return;
    // na ligação recebida o áudio da chamada só começa depois de atender
    if (loops || performance.now() - lastIncoming < 5000) return;
    if (!ringing()) return;
    const observer = new MutationObserver(() => { if (!ringing()) endRing(); });
    observer.observe(document.body || root, { childList: true, subtree: true });
    ring = { el, wasMuted: el.muted, observer, timer: setTimeout(endRing, MAX_RING_MS) };
    el.muted = true;
    if (!el.__holoRingWatched) {
      el.__holoRingWatched = true;
      el.addEventListener('emptied', () => { if (ring && ring.el === el) endRing(); });
      el.addEventListener('ended', () => { if (ring && ring.el === el) endRing(); });
    }
    emit('call-outgoing', 'play');
  };

  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const s = root.hasAttribute('data-holo-sound') ? classify(this) : null;
    if (!s) {
      unknown(this);
      maybeRing(this);
      return play.apply(this, arguments);
    }
    if (s.loop) {
      if (active.has(this)) return Promise.resolve();
      active.set(this, s.kind);
      loops++;
      if (s.kind === 'call-incoming') lastIncoming = performance.now();
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
    if (ring && ring.el === this) endRing();
    return pause.apply(this, arguments);
  };
})();
