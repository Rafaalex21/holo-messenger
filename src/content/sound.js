/*
 * Sons da extensão (mundo isolado) — spec §8.3; F6.4.
 *
 * Escuta 'holo:sound' do page-hook.js e toca o som correspondente com Web
 * Audio: os bytes vêm do background, viram AudioBuffer e tocam num
 * AudioBufferSourceNode. Sem elemento de mídia com URL na página (a CSP do
 * WhatsApp não entra) e com loop sem emenda para os toques de ligação.
 *
 * Também mantém <html data-holo-sound> conforme config.sound.mode, que é o
 * que liga o gancho: 'whatsapp' tira o atributo (o WhatsApp toca o dele),
 * 'silent' só cala o original, os demais trocam pelo som da extensão.
 */
(() => {
  const HOLO = globalThis.HOLO;
  const root = document.documentElement;
  const LOOPS = new Set(['call-outgoing', 'call-incoming']);
  const KINDS = new Set(['message', ...LOOPS]);
  const MESSAGE_GAP_MS = 1500; // antispam: rajada de mensagens num grupo → 1 som

  let cfg = null;
  let ctx = null;
  let gain = null;
  let lastMessage = 0;
  const buffers = new Map();  // tipo → Promise<AudioBuffer>
  const playing = new Map();  // tipo → AudioBufferSourceNode (só loops)
  const wanted = new Set();   // loops pedidos e ainda não parados

  const audible = () => cfg && cfg.sound.mode !== 'silent' && cfg.sound.mode !== 'whatsapp';

  const context = () => {
    if (!ctx) {
      ctx = new AudioContext();
      gain = ctx.createGain();
      gain.gain.value = cfg.sound.volume;
      gain.connect(ctx.destination);
    }
    return ctx;
  };

  const buffer = (kind) => {
    if (!buffers.has(kind)) {
      const p = browser.runtime.sendMessage({ type: 'holo:sound-bytes', kind })
        .then((bytes) => context().decodeAudioData(bytes));
      p.catch(() => buffers.delete(kind)); // tenta de novo na próxima
      buffers.set(kind, p);
    }
    return buffers.get(kind);
  };

  // Sem interação do usuário com a página o Firefox segura o AudioContext
  // ("suspended"). Nesse caso o background toca no lugar.
  const usedBackground = new Set();
  const viaBackground = (kind, action) => {
    if (action === 'play') usedBackground.add(kind);
    else if (!usedBackground.delete(kind)) return; // só manda parar o que ele tocou
    return browser.runtime.sendMessage({ type: 'holo:sound-play', kind, action }).catch((e) => HOLO.soundLog(`${kind}: reserva falhou (${e && e.message})`));
  };

  // No Firefox, resume() de um contexto bloqueado NÃO falha: fica pendente até
  // a pessoa interagir com a página. Sem limite de tempo o som nunca tocava.
  const resumeQuick = (c) => Promise.race([
    c.resume().catch(() => {}),
    new Promise((r) => setTimeout(r, 300))
  ]);

  const start = async (kind) => {
    if (!audible()) { HOLO.soundLog(`${kind}: interceptado, modo ${cfg && cfg.sound.mode} (sem som)`); return; }
    if (kind === 'message') {
      const now = Date.now();
      if (now - lastMessage < MESSAGE_GAP_MS) return;
      lastMessage = now;
    } else {
      if (wanted.has(kind)) return;
      wanted.add(kind);
    }
    try {
      const c = context();
      if (c.state !== 'running') await resumeQuick(c);
      if (c.state !== 'running') {
        HOLO.soundLog(`${kind}: página sem permissão de áudio (${c.state}) → reserva`);
        viaBackground(kind, 'play');
        return;
      }
      const buf = await buffer(kind);
      if (LOOPS.has(kind) && !wanted.has(kind)) return; // parou enquanto carregava
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = LOOPS.has(kind);
      src.connect(gain);
      if (src.loop) playing.set(kind, src);
      src.start();
      HOLO.soundLog(`${kind}: tocou na página`);
    } catch (e) {
      HOLO.soundLog(`${kind}: erro na página (${e && (e.name || e.message)}) → reserva`);
      viaBackground(kind, 'play');
    }
  };

  const stop = (kind) => {
    wanted.delete(kind);
    const src = playing.get(kind);
    playing.delete(kind);
    if (src) try { src.stop(); } catch (e) { /* já parado */ }
    viaBackground(kind, 'stop');
  };

  window.addEventListener('holo:sound-seen', (e) => HOLO.soundLog(`WhatsApp tocou ${String(e.detail).slice(0, 60)} (não reconhecido)`));

  const stopAll = () => { for (const k of LOOPS) if (wanted.has(k) || playing.has(k)) stop(k); };

  window.addEventListener('holo:sound', (e) => {
    const [kind, action] = String(e.detail).split(':');
    if (!KINDS.has(kind)) return;
    if (action === 'play') {
      if (kind !== 'message' || Date.now() - lastMessage >= MESSAGE_GAP_MS) HOLO.soundLog(`${kind}: WhatsApp ia tocar → interceptado`);
      start(kind);
    }
    else if (action === 'stop') stop(kind);
  });

  const apply = (c) => {
    cfg = c;
    const mode = c.sound.mode;
    if (mode === 'whatsapp') root.removeAttribute('data-holo-sound');
    else root.setAttribute('data-holo-sound', mode === 'silent' ? 'silent' : 'replace');
    if (gain) gain.gain.value = c.sound.volume;
    if (!audible()) stopAll();
  };

  HOLO.loadConfig().then(apply, () => apply(HOLO.mergeConfig(null)))
    .then(() => HOLO.soundLog(`WhatsApp aberto, som pronto (modo ${cfg.sound.mode})`));
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[HOLO.CONFIG_KEY]) apply(HOLO.mergeConfig(changes[HOLO.CONFIG_KEY].newValue));
  });
  // o WhatsApp reescreve atributos do <html> ao carregar; devolve o nosso
  new MutationObserver(() => {
    if (cfg && cfg.sound.mode !== 'whatsapp' && !root.hasAttribute('data-holo-sound')) apply(cfg);
  }).observe(root, { attributes: true, attributeFilter: ['data-holo-sound'] });
})();
