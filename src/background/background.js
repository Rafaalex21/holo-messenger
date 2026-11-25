/*
 * Background (event page) — spec §4.1.
 * Grava a configuração padrão na instalação e mostra "OFF" no ícone quando o
 * tema está desligado. O clique no ícone abre o popup (src/popup).
 * Sons (F6): entrega os bytes do arquivo ao content script (que toca com Web
 * Audio) e toca no lugar dele quando a página ainda não pode tocar áudio.
 */
const HOLO = globalThis.HOLO;

const showState = (cfg) => {
  browser.action.setBadgeText({ text: cfg.enabled ? '' : 'OFF' });
  browser.action.setBadgeBackgroundColor({ color: '#ff5a50' });
  browser.action.setTitle({ title: `Holo-Messenger: tema ${cfg.enabled ? 'ligado' : 'desligado'}` });
};

browser.runtime.onInstalled.addListener(async () => {
  // mergeConfig preserva o que o usuário já tinha e completa chaves novas
  const cfg = await HOLO.loadConfig();
  await browser.storage.local.set({ [HOLO.CONFIG_KEY]: cfg });
  showState(cfg);
});

browser.runtime.onStartup.addListener(async () => showState(await HOLO.loadConfig()));

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[HOLO.CONFIG_KEY]) showState(HOLO.mergeConfig(changes[HOLO.CONFIG_KEY].newValue));
});

// ------------------------------------------------------------------ sons
// Arquivos inclusos (assets/sounds/NOTICE.md). O som próprio do usuário
// (modo 'custom', página de opções da F7) entra aqui quando existir.
const SOUND_FILES = {
  message: 'assets/sounds/message.mp3',
  'call-outgoing': 'assets/sounds/call-outgoing.mp3',
  'call-incoming': 'assets/sounds/call-incoming.mp3'
};
const LOOPS = new Set(['call-outgoing', 'call-incoming']);
const bgAudio = new Map(); // tipo → HTMLAudioElement (só o plano reserva)

const soundBytes = async (kind) => {
  const res = await fetch(browser.runtime.getURL(SOUND_FILES[kind]));
  return res.arrayBuffer();
};

const playHere = async (kind, action) => {
  const old = bgAudio.get(kind);
  if (old) { old.pause(); bgAudio.delete(kind); }
  if (action !== 'play') return;
  const cfg = await HOLO.loadConfig();
  const a = new Audio(browser.runtime.getURL(SOUND_FILES[kind]));
  a.volume = cfg.sound.volume;
  a.loop = LOOPS.has(kind);
  if (a.loop) bgAudio.set(kind, a);
  try {
    await a.play();
    HOLO.soundLog(`${kind}: reserva tocou`);
  } catch (e) {
    bgAudio.delete(kind);
    HOLO.soundLog(`${kind}: reserva bloqueada (${e && (e.name || e.message)})`);
  }
};

browser.runtime.onMessage.addListener((msg) => {
  if (!msg || !SOUND_FILES[msg.kind]) return undefined;
  if (msg.type === 'holo:sound-bytes') return soundBytes(msg.kind);
  if (msg.type === 'holo:sound-play') return playHere(msg.kind, msg.action);
  return undefined;
});
