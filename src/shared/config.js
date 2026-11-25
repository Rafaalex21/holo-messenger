/*
 * Configuração do Holo-Messenger (spec §9.1).
 * Carregado no background e no content script; expõe tudo em globalThis.HOLO.
 */
(() => {
  const HOLO = globalThis.HOLO || (globalThis.HOLO = {});

  HOLO.CONFIG_KEY = 'holo:config';

  HOLO.DEFAULTS = Object.freeze({
    enabled: true,
    palette: 'yellow',              // 'yellow' | 'teal'
    fx: { scanlines: true, glow: true, glitch: true },
    footerHints: true,
    breadcrumb: true,
    sound: { mode: 'custom', volume: 0.8, customName: null }, // 'custom' | 'default' | 'silent' | 'whatsapp'
    soundStrategy: 'auto'            // 'auto' | 'intercept' | 'title'
  });

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  // Junta o que está salvo com os padrões: chaves novas ganham o padrão,
  // tipos errados são descartados.
  HOLO.mergeConfig = (stored, base = HOLO.DEFAULTS) => {
    const out = {};
    for (const [k, def] of Object.entries(base)) {
      const v = isObj(stored) ? stored[k] : undefined;
      if (isObj(def)) out[k] = HOLO.mergeConfig(v, def);
      else out[k] = (v === undefined || (def !== null && typeof v !== typeof def)) ? def : v;
    }
    return out;
  };

  HOLO.loadConfig = async () => {
    const got = await browser.storage.local.get(HOLO.CONFIG_KEY);
    return HOLO.mergeConfig(got[HOLO.CONFIG_KEY]);
  };

  HOLO.saveConfig = async (patch) => {
    const current = await HOLO.loadConfig();
    const next = HOLO.mergeConfig({ ...current, ...patch });
    await browser.storage.local.set({ [HOLO.CONFIG_KEY]: next });
    return next;
  };
})();
