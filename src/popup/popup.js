/*
 * Popup (spec §9.2): lê a configuração, mostra e grava cada mudança.
 * Quem aplica é o content script (storage.onChanged), sem recarregar o WhatsApp.
 */
(() => {
  const HOLO = globalThis.HOLO;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const enabled = $('#enabled');
  const layouts = $$('input[name="buttonLayout"]');
  const palettes = $$('input[name="palette"]');
  const effects = $$('input[name="fx"]');
  const modes = $$('input[name="soundMode"]');
  const volume = $('#volume');
  const volumeOut = $('#volumeOut');
  const soundBox = $('.sound');
  let cfg = HOLO.mergeConfig(null);

  const SOUND_FILES = {
    message: 'assets/sounds/message.mp3',
    'call-outgoing': 'assets/sounds/call-outgoing.mp3',
    'call-incoming': 'assets/sounds/call-incoming.mp3'
  };

  const render = (c) => {
    cfg = c;
    enabled.checked = c.enabled;
    document.body.classList.toggle('off', !c.enabled);
    for (const r of layouts) r.checked = r.value === c.buttonLayout;
    for (const r of palettes) r.checked = r.value === c.palette;
    for (const b of effects) b.checked = !!c.fx[b.value];
    // 'custom' (som próprio, F7) ainda não tem arquivo: aparece como Cyberpunk
    const mode = c.sound.mode === 'custom' ? 'cyberpunk' : c.sound.mode;
    for (const r of modes) r.checked = r.value === mode;
    soundBox.classList.toggle('off', mode !== 'cyberpunk');
    if (document.activeElement !== volume) volume.value = Math.round(c.sound.volume * 100);
    volumeOut.textContent = volume.value;
  };

  const saveSound = (patch) => HOLO.saveConfig({ sound: { ...cfg.sound, ...patch } });

  HOLO.loadConfig().then(render, () => render(cfg));

  enabled.addEventListener('change', () => HOLO.saveConfig({ enabled: enabled.checked }));
  for (const r of palettes) {
    r.addEventListener('change', () => { if (r.checked) HOLO.saveConfig({ palette: r.value }); });
  }
  // grava os três de uma vez a partir das caixas: dois cliques rápidos não se apagam
  for (const b of effects) {
    b.addEventListener('change', () => HOLO.saveConfig({ fx: Object.fromEntries(effects.map((e) => [e.value, e.checked])) }));
  }
  for (const r of layouts) {
    r.addEventListener('change', () => { if (r.checked) HOLO.saveConfig({ buttonLayout: r.value }); });
  }
  for (const r of modes) {
    r.addEventListener('change', () => { if (r.checked) saveSound({ mode: r.value }); });
  }

  volume.addEventListener('input', () => {
    volumeOut.textContent = volume.value;
    if (preview) preview.volume = volume.value / 100;
  });
  volume.addEventListener('change', () => saveSound({ volume: volume.value / 100 }));

  // "Testar": toca uma volta do som aqui no popup; clicar de novo para
  let preview = null;
  let previewBtn = null;
  const stopPreview = () => {
    if (preview) preview.pause();
    if (previewBtn) previewBtn.setAttribute('aria-pressed', 'false');
    preview = previewBtn = null;
  };
  for (const btn of $$('.test')) {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const same = previewBtn === btn;
      stopPreview();
      if (same) return;
      preview = new Audio(browser.runtime.getURL(SOUND_FILES[btn.dataset.kind]));
      preview.volume = volume.value / 100;
      previewBtn = btn;
      btn.setAttribute('aria-pressed', 'true');
      preview.addEventListener('ended', stopPreview);
      preview.play().catch(stopPreview);
    });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[HOLO.CONFIG_KEY]) render(HOLO.mergeConfig(changes[HOLO.CONFIG_KEY].newValue));
  });
})();
