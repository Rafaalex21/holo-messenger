/*
 * Content script (mundo isolado, document_start) — spec §4.1.
 * F2: liga/desliga o tema pondo ou tirando atributos no <html>.
 * Todo o CSS do tema vale só sob :root[data-holo], então tirar o
 * atributo devolve o WhatsApp original na hora, sem recarregar.
 */
(() => {
  const HOLO = globalThis.HOLO;
  const root = document.documentElement;
  let current = null;

  const apply = (cfg) => {
    current = cfg;
    if (cfg.enabled) {
      root.setAttribute('data-holo', '');
      root.setAttribute('data-holo-palette', cfg.palette);
      root.setAttribute('data-holo-fx', Object.keys(cfg.fx).filter((k) => cfg.fx[k]).join(' '));
    } else {
      root.removeAttribute('data-holo');
      root.removeAttribute('data-holo-palette');
      root.removeAttribute('data-holo-fx');
    }
  };

  HOLO.loadConfig().then(apply, () => apply(HOLO.mergeConfig(null)));

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[HOLO.CONFIG_KEY]) apply(HOLO.mergeConfig(changes[HOLO.CONFIG_KEY].newValue));
  });

  // O WhatsApp reescreve atributos do <html> ao carregar (classe, lang, dir).
  // Se o data-holo sumir com o tema ligado, põe de volta.
  new MutationObserver(() => {
    if (current && current.enabled && !root.hasAttribute('data-holo')) apply(current);
  }).observe(root, { attributes: true, attributeFilter: ['data-holo'] });
})();
