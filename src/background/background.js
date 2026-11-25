/*
 * Background (event page) — spec §4.1.
 * Grava a configuração padrão na instalação e mostra "OFF" no ícone quando o
 * tema está desligado. O clique no ícone abre o popup (src/popup).
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
