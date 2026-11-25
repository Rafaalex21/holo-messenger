/*
 * Popup (spec §9.2): lê a configuração, mostra e grava cada mudança.
 * Quem aplica é o content script (storage.onChanged), sem recarregar o WhatsApp.
 */
(() => {
  const HOLO = globalThis.HOLO;
  const enabled = document.getElementById('enabled');
  const layouts = [...document.querySelectorAll('input[name="buttonLayout"]')];

  const render = (cfg) => {
    enabled.checked = cfg.enabled;
    document.body.classList.toggle('off', !cfg.enabled);
    for (const r of layouts) r.checked = r.value === cfg.buttonLayout;
  };

  HOLO.loadConfig().then(render, () => render(HOLO.mergeConfig(null)));

  enabled.addEventListener('change', () => HOLO.saveConfig({ enabled: enabled.checked }));
  for (const r of layouts) {
    r.addEventListener('change', () => { if (r.checked) HOLO.saveConfig({ buttonLayout: r.value }); });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[HOLO.CONFIG_KEY]) render(HOLO.mergeConfig(changes[HOLO.CONFIG_KEY].newValue));
  });
})();
