/*
 * Background (event page) — spec §4.1.
 * F2: grava a configuração padrão na instalação e faz o ícone da barra
 * ligar/desligar o tema (até o popup da F7 existir).
 */
const HOLO = globalThis.HOLO;

const showState = (cfg) => {
  browser.action.setBadgeText({ text: cfg.enabled ? '' : 'OFF' });
  browser.action.setBadgeBackgroundColor({ color: '#ff5a50' });
  browser.action.setTitle({ title: `Holo-Messenger: tema ${cfg.enabled ? 'ligado' : 'desligado'} (clique para ${cfg.enabled ? 'desligar' : 'ligar'})` });
};

browser.runtime.onInstalled.addListener(async () => {
  // mergeConfig preserva o que o usuário já tinha e completa chaves novas
  const cfg = await HOLO.loadConfig();
  await browser.storage.local.set({ [HOLO.CONFIG_KEY]: cfg });
  showState(cfg);
});

browser.runtime.onStartup.addListener(async () => showState(await HOLO.loadConfig()));

browser.action.onClicked.addListener(async () => {
  const cfg = await HOLO.loadConfig();
  showState(await HOLO.saveConfig({ enabled: !cfg.enabled }));
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[HOLO.CONFIG_KEY]) showState(HOLO.mergeConfig(changes[HOLO.CONFIG_KEY].newValue));
});
