/*
 * Content script (mundo isolado, document_start) — spec §4.1.
 *
 * F2: liga/desliga o tema pondo ou tirando atributos no <html>. Todo o CSS
 *     vale só sob :root[data-holo], então tirar o atributo devolve o WhatsApp
 *     original na hora, sem recarregar.
 * F4: marca o que o CSS sozinho não alcança e injeta o rodapé CALL / CLOSE:
 *     - data-holo-bubble="in|out" no elemento que pinta o balão. A direção
 *       vem da cor de fundo calculada (o tema pinta recebidas e enviadas com
 *       tokens diferentes); o "rabinho" só existe na 1ª mensagem de cada
 *       sequência, então não serve sozinho (docs/selectors.md §2);
 *     - data-holo-chip="date" nos separadores de data (fora das linhas de
 *       mensagem, com o fundo de "mensagem do sistema");
 *     - .holo-footer depois do <footer> da conversa;
 *     - data-holo-unread="N" no pai do nome de cada conversa da lista, para o
 *       CSS desenhar o contador amarelo logo depois do nome (como no jogo).
 *     Nada aqui lê o texto das mensagens: só cores, posição, atributos e o
 *     número do contador de não lidas.
 */
(() => {
  const HOLO = globalThis.HOLO;
  const SEL = globalThis.HOLO_SEL;
  const find = globalThis.HOLO_SEL_FIND;
  const root = document.documentElement;
  let current = null;

  // ---------------------------------------------------------------- tema
  const apply = (cfg) => {
    const wasOn = !!(current && current.enabled);
    current = cfg;
    if (cfg.enabled) {
      root.setAttribute('data-holo', '');
      root.setAttribute('data-holo-palette', cfg.palette);
      root.setAttribute('data-holo-fx', Object.keys(cfg.fx).filter((k) => cfg.fx[k]).join(' '));
      root.setAttribute('data-holo-opts', [cfg.breadcrumb && 'breadcrumb', cfg.footerHints && 'footer'].filter(Boolean).join(' '));
      if (!wasOn) queueFullScan();
    } else {
      for (const a of ['data-holo', 'data-holo-palette', 'data-holo-fx', 'data-holo-opts']) root.removeAttribute(a);
    }
    schedule();
  };

  // ------------------------------------------------- cores dos tokens
  const toRgb = (v) => {
    v = (v || '').trim();
    const m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return v;
    let h = m[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const tokens = () => {
    const cs = getComputedStyle(root);
    return {
      in: toRgb(cs.getPropertyValue('--holo-in-bg')),
      out: toRgb(cs.getPropertyValue('--holo-out-bg')),
      sys: toRgb(cs.getPropertyValue('--holo-bg-panel'))
    };
  };

  // ------------------------------------------------------------ balões
  const BUBBLE_DEPTH = 6;
  const markBubble = (container, tk) => {
    let level = [...container.children];
    for (let depth = 0; depth < BUBBLE_DEPTH && level.length; depth++) {
      const next = [];
      for (const el of level) {
        if (el.matches(SEL.tail)) continue;
        const bg = getComputedStyle(el).backgroundColor;
        const dir = bg === tk.in ? 'in' : bg === tk.out ? 'out' : null;
        if (dir) {
          el.setAttribute('data-holo-bubble', dir);
          container.setAttribute('data-holo-dir', dir);
          return dir;
        }
        next.push(...el.children);
      }
      level = next;
    }
    // figurinha, mensagem apagada…: sem balão pintado, fica sem moldura
    container.setAttribute('data-holo-dir', 'none');
    return 'none';
  };

  const PENDING = `${SEL.msgContainer}:not([data-holo-dir="none"]):not(:has([data-holo-bubble]))`;
  /** Marca os balões pendentes; devolve os contêineres vistos pela 1ª vez. */
  const scanBubbles = (scope, tk) => {
    const fresh = [];
    const list = scope.matches && scope.matches(PENDING) ? [scope] : [];
    list.push(...scope.querySelectorAll(PENDING));
    for (const c of list) {
      const firstTime = !c.hasAttribute('data-holo-dir'); // re-render do React não conta
      const dir = markBubble(c, tk);
      if (firstTime) fresh.push({ container: c, dir });
    }
    return fresh;
  };

  // ---------------------------------------------- glitch (F5.1, spec RF-07)
  // Só em mensagem RECEBIDA que acabou de chegar: no máximo 2 balões novos no
  // quadro e entre os 2 últimos da conversa. Abrir conversa, trocar de
  // conversa ou carregar histórico marca muitos de uma vez → sem glitch.
  const GLITCH_MS = 220;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const maybeGlitch = (fresh, panel) => {
    if (!current.fx.glitch || reducedMotion.matches || !panel || fresh.length === 0 || fresh.length > 2) return;
    const all = panel.querySelectorAll(SEL.msgContainer);
    const lastTwo = [all[all.length - 1], all[all.length - 2]];
    for (const { container, dir } of fresh) {
      if (dir !== 'in' || !lastTwo.includes(container)) continue;
      container.setAttribute('data-holo-new', '');
      setTimeout(() => container.removeAttribute('data-holo-new'), GLITCH_MS + 150);
    }
  };

  // -------------------------------------------------- separadores de data
  // candidatos: tudo no painel que NÃO está dentro de uma linha de mensagem
  const CHIP_CANDIDATES = 'div:not([role="row"], [role="row"] *, [data-holo-chip]), span:not([role="row"] *, [data-holo-chip])';
  const scanChips = (scope, panel, tk) => {
    if (!panel) return;
    const base = scope.contains(panel) ? panel : panel.contains(scope) ? scope : null;
    if (!base || base.closest(SEL.msgRow)) return;
    for (const el of base.querySelectorAll(CHIP_CANDIDATES)) {
      // só confere se há texto (o rótulo da data), sem guardar nem usar o conteúdo
      if (getComputedStyle(el).backgroundColor === tk.sys && el.firstChild) el.setAttribute('data-holo-chip', 'date');
    }
  };

  // ------------------------------------------ não lidas ao lado do nome
  // O WhatsApp põe o contador numa bolinha à direita, cada tipo de conversa
  // (contato, grupo, canal, comunidade) num lugar diferente. Aqui só o número
  // é copiado para o pai do nome; o CSS desenha e esconde a bolinha original
  // apenas nas linhas marcadas (se isto falhar, a bolinha continua lá).
  const UNREAD = '[data-testid="icon-unread-count"]';
  const LIST_ROW = '[data-testid="cell-frame-container"]';
  const LIST_NAME = '[data-testid="cell-frame-title"] span[title]';
  const scanUnread = () => {
    const side = document.getElementById('pane-side');
    if (!side) return;
    for (const row of side.querySelectorAll(LIST_ROW)) {
      const name = row.querySelector(LIST_NAME);
      const host = name && name.parentElement;
      if (!host) continue;
      const badge = row.querySelector(UNREAD);
      // só os dígitos do contador; sem número ("marcada como não lida") vira um ponto
      const n = badge ? (badge.textContent || '').replace(/\D/g, '') || '•' : null;
      if (n === null) host.removeAttribute('data-holo-unread');
      else if (host.getAttribute('data-holo-unread') !== n) host.setAttribute('data-holo-unread', n);
    }
  };

  // ------------------------------------------------------ rodapé CALL/CLOSE
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const startCall = () => {
    const btn = find(SEL.voiceCall);
    if (btn) btn.click();
  };

  const closeChat = async () => {
    const main = find(SEL.main);
    if (!main) return;
    // 1º: Esc, o atalho do próprio WhatsApp para fechar a conversa
    const target = document.activeElement && main.contains(document.activeElement) ? document.activeElement : main;
    for (const type of ['keydown', 'keyup']) {
      target.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    }
    await wait(250);
    if (!find(SEL.main)) return;
    // 2º: menu do cabeçalho → "Fechar conversa"
    const menuBtn = find(SEL.headerMenu);
    if (!menuBtn) return;
    menuBtn.click();
    for (let i = 0; i < 10; i++) {
      await wait(60);
      const item = [...document.querySelectorAll(SEL.menuItems)].find((el) => SEL.closeChatText.test(el.textContent || ''));
      if (item) { item.click(); return; }
    }
  };

  // Glifos dos botões desenhados em SVG (centro geométrico exato, sem
  // depender das métricas da fonte). Formas genéricas, sem logotipos.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const GLYPHS = {
    // Microsoft: letras
    Y: [['path', { d: 'M6 5.4 9 9.1l3-3.7M9 9.1v3.5', fill: 'none' }]],
    B: [['path', { d: 'M6.4 5.2h3.4a1.9 1.9 0 0 1 0 3.8H6.4zm0 3.8h3.8a1.9 1.9 0 0 1 0 3.8H6.4z', fill: 'none' }]],
    // Sony: formas
    triangle: [['path', { d: 'M9 5.3 12.5 11.4H5.5z', fill: 'none' }]],
    circle: [['circle', { cx: 9, cy: 9, r: 3.5, fill: 'none' }]]
  };
  const LAYOUTS = {
    xbox: { call: 'Y', close: 'B' },
    playstation: { call: 'triangle', close: 'circle' }
  };
  const glyph = (name) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'holo-key');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('aria-hidden', 'true');
    for (const [tag, attrs] of [['circle', { cx: 9, cy: 9, r: 8, fill: 'none' }], ...GLYPHS[name]]) {
      const el = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.append(el);
    }
    return svg;
  };

  const buildFooter = (layout) => {
    const keys = LAYOUTS[layout] || LAYOUTS.xbox;
    const el = document.createElement('div');
    el.className = 'holo-footer';
    el.setAttribute('data-holo-injected', '');
    el.setAttribute('data-holo-layout', layout);
    const rule = document.createElement('div');
    rule.className = 'holo-rule';
    const hints = document.createElement('div');
    hints.className = 'holo-footer-hints';
    const hint = (action, label, aria, run) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'holo-hint';
      b.setAttribute('data-holo-action', action);
      b.setAttribute('aria-label', aria);
      b.title = aria;
      const t = document.createElement('span');
      t.textContent = label;
      b.append(glyph(keys[action]), t);
      b.addEventListener('click', (e) => { e.preventDefault(); run(); });
      return b;
    };
    hints.append(hint('call', 'CALL', 'Ligar (chamada de voz)', startCall), hint('close', 'CLOSE', 'Fechar conversa', closeChat));
    el.append(rule, hints);
    return el;
  };

  const ensureFooter = () => {
    const existing = document.querySelector('.holo-footer');
    const footer = current && current.enabled && current.footerHints ? find(SEL.mainFooter) : null;
    if (!footer) { if (existing) existing.remove(); return; }
    const layout = current.buttonLayout;
    if (existing && existing.previousElementSibling === footer && existing.getAttribute('data-holo-layout') === layout) return;
    if (existing) existing.remove();
    footer.after(buildFooter(layout));
  };

  // ------------------------------------------------------- agendamento
  const added = new Set();
  let fullScan = false;
  let unreadDirty = false;
  let frame = 0;
  function queueFullScan() { fullScan = true; unreadDirty = true; schedule(); }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(run);
  }
  function run() {
    frame = 0;
    if (!current || !current.enabled) { added.clear(); ensureFooter(); return; }
    if (unreadDirty) { unreadDirty = false; scanUnread(); }
    const main = find(SEL.main);
    ensureFooter();
    if (!main) { added.clear(); fullScan = false; return; }
    const tk = tokens();
    if (!tk.in) return; // CSS do tema ainda não aplicado
    const panel = find(SEL.messagesPanel, main);
    // varredura completa ao ligar o tema ou quando o WhatsApp troca um bloco
    // que contém o #main inteiro (abrir outra conversa, recarregar o app)
    if (fullScan || [...added].some((n) => n.isConnected && n.contains(main))) {
      fullScan = false;
      added.clear();
      scanBubbles(main, tk);
      scanChips(main, panel, tk);
      return;
    }
    const fresh = [];
    for (const node of added) {
      if (!node.isConnected || !main.contains(node)) continue;
      fresh.push(...scanBubbles(node, tk));
      scanChips(node, panel, tk);
    }
    added.clear();
    maybeGlitch(fresh, panel);
  }

  new MutationObserver((records) => {
    if (!current || !current.enabled) return;
    const side = document.getElementById('pane-side');
    for (const r of records) {
      // lista de conversas mudou (nova linha, contador trocou de 1 para 2…)
      if (!unreadDirty && side && side.contains(r.target)) unreadDirty = true;
      for (const n of r.addedNodes) if (n.nodeType === 1 && !n.hasAttribute('data-holo-injected')) added.add(n);
    }
    if (added.size || unreadDirty) schedule();
  }).observe(root, { childList: true, subtree: true, characterData: true });

  // ------------------------------------------------------------ início
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
