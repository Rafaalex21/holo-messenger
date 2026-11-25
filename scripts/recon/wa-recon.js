/*
 * holoRecon — inspeção do WhatsApp Web (Fase F1 do spec.md)
 *
 * Como usar (Firefox, WhatsApp Web logado):
 *   1. F12 → Console. Se o Firefox pedir, digite "permitir colar" e Enter.
 *   2. Cole este arquivo inteiro e Enter. Aparece "[holoRecon] pronto".
 *   3. Deixe outra conversa aberta (ou troque de aba) e receba uma mensagem
 *      de alguém para o som de notificação tocar.
 *   4. Abra uma conversa com mensagens recebidas e enviadas e rode:
 *        holoRecon.save()
 *      Dois arquivos vão para Downloads: wa-recon.json e wa-snapshot.html.
 *
 * O que NÃO sai daqui: texto de mensagens, nomes, números, fotos, links.
 * Todo texto vira "lorem", imagens viram um pixel cinza, ids com número
 * viram "fake". O título da notificação (nome do contato) nunca é lido.
 */
(() => {
  if (window.holoRecon) { console.log('[holoRecon] já estava carregado'); return; }
  const R = window.holoRecon = { sound: [], startedAt: new Date().toISOString(), version: 1 };
  const t0 = performance.now();
  const log = (kind, info) => {
    R.sound.push(Object.assign({ ms: Math.round(performance.now() - t0), kind }, info));
    console.log('[holoRecon]', kind, info);
  };
  const safeUrl = (u) => {
    try {
      const x = new URL(u, location.href);
      if (x.protocol === 'blob:' || x.protocol === 'data:') return x.protocol + '…';
      return x.origin + x.pathname;
    } catch (e) { return String(u).slice(0, 80); }
  };
  const stack = () => (new Error().stack || '').split('\n').slice(2, 7)
    .map((s) => s.replace(/\?[^:\s)]*/g, '').slice(0, 180));

  /* ---------- ganchos de som ---------- */
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    log('media.play', { tag: this.tagName, src: safeUrl(this.currentSrc || this.src), inDom: this.isConnected, volume: this.volume, muted: this.muted, stack: stack() });
    return play.apply(this, arguments);
  };
  const A = window.Audio;
  const AudioHook = function (src) { log('new Audio', { src: src ? safeUrl(src) : null, stack: stack() }); return src === undefined ? new A() : new A(src); };
  AudioHook.prototype = A.prototype;
  window.Audio = AudioHook;
  const srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true, enumerable: srcDesc.enumerable,
    get() { return srcDesc.get.call(this); },
    set(v) { log('media.src=', { tag: this.tagName, src: safeUrl(v) }); srcDesc.set.call(this, v); }
  });
  if (window.AudioBufferSourceNode) {
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () {
      log('webaudio.start', { duration: this.buffer ? this.buffer.duration : null, stack: stack() });
      return start.apply(this, arguments);
    };
  }
  if (window.BaseAudioContext) {
    const dec = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = function (buf) {
      log('webaudio.decode', { bytes: buf ? buf.byteLength : null, stack: stack() });
      return dec.apply(this, arguments);
    };
  }
  const f = window.fetch;
  window.fetch = function (input) {
    const u = typeof input === 'string' ? input : (input && input.url) || '';
    if (/\.(mp3|ogg|oga|wav|m4a|aac|opus)(\?|$)/i.test(u)) log('fetch(audio)', { url: safeUrl(u) });
    return f.apply(this, arguments);
  };
  if (window.Notification) {
    const N = window.Notification;
    const NotifHook = function (title, opts) {
      log('Notification', { silent: opts ? opts.silent : undefined, optionKeys: opts ? Object.keys(opts) : [] });
      return new N(title, opts);
    };
    Object.setPrototypeOf(NotifHook, N);
    NotifHook.prototype = N.prototype;
    Object.defineProperty(NotifHook, 'permission', { get: () => N.permission });
    NotifHook.requestPermission = N.requestPermission.bind(N);
    window.Notification = NotifHook;
    R.notificationPermission = N.permission;
  }
  let lastUnread = null;
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => {
      const m = document.title.match(/^\((\d+)\)/);
      const n = m ? Number(m[1]) : 0;
      if (n !== lastUnread) { log('title', { unread: n }); lastUnread = n; }
    }).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
  // recursos de áudio já carregados antes do script
  R.preloadedAudio = performance.getEntriesByType('resource')
    .filter((e) => /\.(mp3|ogg|oga|wav|m4a|aac|opus)(\?|$)/i.test(e.name) || e.initiatorType === 'audio')
    .map((e) => ({ url: safeUrl(e.name), initiator: e.initiatorType }));

  /* ---------- proteção de dados ---------- */
  const sensitive = () => {
    const s = new Set();
    const add = (v) => { v = (v || '').trim(); if (v.length >= 2) s.add(v.toLowerCase()); };
    document.querySelectorAll('#pane-side span[title], #main header span[title], #main header [dir="auto"], [data-pre-plain-text]').forEach((e) => {
      add(e.getAttribute('title')); add(e.textContent);
      const p = e.getAttribute('data-pre-plain-text');
      if (p) add(p.replace(/^\[[^\]]*\]\s*/, '').replace(/:\s*$/, ''));
    });
    return s;
  };
  const badId = (v) => /\d{4,}|@|\+\d/.test(v || '');
  const makeLabelCheck = () => {
    const names = sensitive();
    return (el, label) => {
      if (!label) return false;
      const l = label.trim().toLowerCase();
      if (l.length > 40 || badId(l)) return false;
      if (el && el.closest && el.closest('#pane-side, [data-id], [role="row"]')) return false;
      for (const n of names) if (n && (l.includes(n) || n.includes(l))) return false;
      return true;
    };
  };

  /* ---------- estrutura ---------- */
  const SEMANTIC = /^(message-in|message-out|selectable-text|copyable-text|copyable-area|focusable-list-item|dark|light|color-refresh|web|os-win|os-mac)$/;
  const sig = (el) => {
    if (!el) return null;
    const o = { tag: el.tagName.toLowerCase() };
    if (el.id) o.id = badId(el.id) ? 'fake' : el.id;
    const role = el.getAttribute('role'); if (role) o.role = role;
    if (el.dataset && el.dataset.testid) o.testid = badId(el.dataset.testid) ? 'fake' : el.dataset.testid;
    if (el.dataset && el.dataset.icon) o.icon = el.dataset.icon;
    if (el.dataset && el.dataset.tab) o.tab = el.dataset.tab;
    if (el.hasAttribute && el.hasAttribute('data-id')) o.dataId = (el.getAttribute('data-id').match(/^(true|false)_/) || ['?'])[0];
    const sem = [...(el.classList || [])].filter((c) => SEMANTIC.test(c)); if (sem.length) o.cls = sem;
    o.nClasses = el.classList ? el.classList.length : 0;
    const attrs = [...el.attributes].map((a) => a.name).filter((n) => /^(aria-|data-|contenteditable|title|tabindex|dir)/.test(n)); if (attrs.length) o.attrs = attrs;
    return o;
  };
  const outline = (el, depth = 0, max = 16) => {
    if (!el || depth > max) return null;
    const o = sig(el);
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (txt) o.textLen = txt.length;
    const kids = [...el.children].map((c) => outline(c, depth + 1, max)).filter(Boolean);
    if (kids.length) o.children = kids;
    return o;
  };
  const count = (s) => { try { return document.querySelectorAll(s).length; } catch (e) { return 'ERR'; } };
  const PROBES = {
    app: ['#app'], sidebar: ['#side'], paneSide: ['#pane-side'], chatListGrid: ['#pane-side [role="grid"]', '#pane-side [role="list"]'],
    chatRow: ['#pane-side [role="row"]', '#pane-side [role="listitem"]'], chatRowSelected: ['#pane-side [aria-selected="true"]'],
    unreadBadge: ['#pane-side [aria-label*="não lida" i]', '#pane-side [aria-label*="unread" i]'],
    searchBox: ['#side [contenteditable="true"]', '#side input[type="text"]', '#side [role="textbox"]'],
    filterTabs: ['#side [role="tab"]', '#side [role="tablist"] button'],
    navRail: ['header[data-tab]', '[role="navigation"]', '#app header'],
    main: ['#main'], chatHeader: ['#main header'], chatTitle: ['#main header span[title]', '#main header [dir="auto"]'],
    msgList: ['#main [role="application"]', '#main [data-tab="8"]'], msgRow: ['#main [role="row"]', '#main [data-id]'],
    msgIn: ['.message-in'], msgOut: ['.message-out'], tailIn: ['[data-icon="tail-in"]'], tailOut: ['[data-icon="tail-out"]'],
    msgText: ['.message-in .selectable-text', '.message-out .selectable-text'], prePlain: ['[data-pre-plain-text]'],
    msgMeta: ['[data-icon="msg-check"]', '[data-icon="msg-dblcheck"]', '[data-icon="msg-time"]'],
    quoted: ['[aria-label*="Mensagem citada" i]', '[aria-label*="Quoted" i]'],
    composerFooter: ['#main footer'], composer: ['#main footer [contenteditable="true"]', 'footer [role="textbox"]'],
    sendBtn: ['[data-icon="send"]', '[data-icon="wds-ic-send-filled"]'], micBtn: ['[data-icon="ptt"]', '[data-icon="mic-outlined"]'],
    attachBtn: ['[data-icon="plus"]', '[data-icon="attach-menu-plus"]', '[data-icon="plus-rounded"]'],
    voiceCall: ['#main header [data-icon*="call" i]', '#main header [aria-label*="Ligação" i]', '#main header [aria-label*="voz" i]'],
    menus: ['[role="application"] ul', '[role="menu"]'], dialog: ['[role="dialog"]'], tooltip: ['[role="tooltip"]'],
    introScreen: ['[data-testid="intro-md-beta-logo-dark"]', '[data-asset-intro-image-light]', '[data-asset-intro-image-dark]'],
    wallpaper: ['[data-asset-chat-background-dark]', '[data-asset-chat-background-light]', '#main [style*="background-image"]']
  };
  const probe = () => {
    const out = {};
    for (const [name, list] of Object.entries(PROBES)) {
      out[name] = list.map((s) => { const n = count(s); let first = null; try { first = sig(document.querySelector(s)); } catch (e) {} return { s, n, first }; });
    }
    return out;
  };
  const cssVars = () => {
    const rules = {}; const blocked = []; const sheets = [];
    for (const sh of document.styleSheets) {
      let list; try { list = sh.cssRules; } catch (e) { blocked.push(safeUrl(sh.href)); continue; }
      sheets.push({ href: sh.href ? safeUrl(sh.href) : 'inline', rules: list.length });
      const walk = (rl) => { for (const r of rl) {
        if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
        if (!r.style || !r.selectorText) continue;
        if (!/^(:root|html|body|\.dark|\.light|\[data-theme|\.color-refresh|\.web)/.test(r.selectorText.trim())) continue;
        for (const p of r.style) if (p.startsWith('--')) {
          (rules[r.selectorText] = rules[r.selectorText] || {})[p] = r.style.getPropertyValue(p).trim().slice(0, 120);
        }
      } };
      walk(list);
    }
    const computed = {};
    const cs = getComputedStyle(document.body);
    for (let i = 0; i < cs.length; i++) { const p = cs[i]; if (p.startsWith('--')) computed[p] = cs.getPropertyValue(p).trim().slice(0, 120); }
    return { sheets, blocked, selectorsWithVars: Object.keys(rules).length, rules, computedOnBody: computed };
  };
  const colors = () => {
    const pick = (s) => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return { bg: c.backgroundColor, fg: c.color, font: c.fontFamily.slice(0, 80), radius: c.borderRadius }; };
    const bubble = (s) => { const row = document.querySelector(s); if (!row) return null;
      let best = null; row.querySelectorAll('div').forEach((d) => { const c = getComputedStyle(d); if (!best && c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') best = { bg: c.backgroundColor, fg: c.color, radius: c.borderRadius, path: sig(d) }; });
      return best; };
    return { body: pick('body'), side: pick('#side'), paneSide: pick('#pane-side'), main: pick('#main'), header: pick('#main header'), footer: pick('#main footer'),
      bubbleIn: bubble('.message-in'), bubbleOut: bubble('.message-out'), htmlClass: document.documentElement.className, bodyClass: document.body.className,
      htmlAttrs: [...document.documentElement.attributes].map((a) => a.name) };
  };
  R.structure = () => {
    const labelOk = makeLabelCheck();
    const labels = {};
    document.querySelectorAll('button[aria-label], [role="button"][aria-label], [data-icon]').forEach((e) => {
      const host = e.matches('[aria-label]') ? e : e.closest('[aria-label]');
      const l = host && host.getAttribute('aria-label');
      if (labelOk(host, l)) labels[l] = (labels[l] || 0) + 1;
    });
    const roles = {}; document.querySelectorAll('[role]').forEach((e) => { const r = e.getAttribute('role'); roles[r] = (roles[r] || 0) + 1; });
    return {
      url: location.origin + location.pathname, ua: navigator.userAgent,
      viewport: [innerWidth, innerHeight],
      ids: [...new Set([...document.querySelectorAll('[id]')].map((e) => (badId(e.id) ? 'fake' : e.id)))].slice(0, 120),
      testids: [...new Set([...document.querySelectorAll('[data-testid]')].map((e) => (badId(e.dataset.testid) ? 'fake' : e.dataset.testid)))],
      icons: [...new Set([...document.querySelectorAll('[data-icon]')].map((e) => e.dataset.icon))],
      tabs: [...new Set([...document.querySelectorAll('[data-tab]')].map((e) => e.dataset.tab))],
      roles, buttonLabels: labels, probes: probe(), colors: colors(), css: cssVars(),
      outlines: {
        chatRow: outline(document.querySelector('#pane-side [role="row"], #pane-side [role="listitem"]')),
        msgIn: outline((document.querySelector('.message-in') || {}).closest ? document.querySelector('.message-in').closest('[data-id], [role="row"]') || document.querySelector('.message-in') : null),
        msgOut: outline((document.querySelector('.message-out') || {}).closest ? document.querySelector('.message-out').closest('[data-id], [role="row"]') || document.querySelector('.message-out') : null),
        chatHeader: outline(document.querySelector('#main header'), 0, 10),
        footer: outline(document.querySelector('#main footer'), 0, 12)
      }
    };
  };

  /* ---------- snapshot sanitizado (fixture de testes) ---------- */
  const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat ';
  const fakeText = (s) => {
    if (/^\s*\d{1,2}:\d{2}\s*$/.test(s)) return '12:00';
    if (!s.trim()) return s;
    let out = ''; while (out.length < s.length) out += LOREM;
    return out.slice(0, Math.max(1, s.trim().length));
  };
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAImJiQAAACwAAAAAAQABAAACAkQBADs=';
  const KEEP = /^(id|class|role|tabindex|dir|contenteditable|spellcheck|style|type|width|height|viewbox|d|fill|fill-rule|clip-rule|stroke|stroke-width|stroke-linecap|stroke-linejoin|xmlns|points|transform|cx|cy|r|rx|ry|x|y|x1|x2|y1|y2|preserveaspectratio|opacity|fill-opacity|data-icon|data-testid|data-tab|data-id|aria-[a-z]+|title|placeholder|src|version)$/i;
  R.snapshot = () => {
    const labelOk = makeLabelCheck();
    const root = document.querySelector('#app') || document.body;
    const origEls = [root, ...root.querySelectorAll('*')];
    const clone = root.cloneNode(true);
    const cloneEls = [clone, ...clone.querySelectorAll('*')];
    let fakeN = 0;
    cloneEls.forEach((el, i) => {
      const orig = origEls[i];
      const tag = el.tagName.toLowerCase();
      if (/^(script|noscript|iframe|object|embed|link|meta)$/.test(tag)) { el.remove(); return; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase(); let v = a.value;
        if (!KEEP.test(n)) { el.removeAttribute(a.name); continue; }
        if (n === 'id' || n === 'data-testid' || n === 'aria-labelledby' || n === 'aria-describedby' || n === 'aria-controls' || n === 'aria-owns' || n === 'aria-activedescendant') {
          if (badId(v)) el.setAttribute(a.name, 'fake-' + (++fakeN));
        } else if (n === 'data-id') {
          el.setAttribute(a.name, ((v.match(/^(true|false)_/) || ['x_'])[0]) + 'fake' + (++fakeN));
        } else if (n === 'aria-label' || n === 'title' || n === 'placeholder' || n === 'aria-description' || n === 'aria-valuetext' || n === 'aria-roledescription') {
          if (!labelOk(orig, v)) el.setAttribute(a.name, n === 'title' ? '' : 'Rótulo');
        } else if (n === 'style') {
          el.setAttribute('style', v.replace(/url\([^)]*\)/gi, 'none'));
        } else if (n === 'src') {
          if (tag === 'img') el.setAttribute('src', PIXEL); else el.removeAttribute('src');
        }
      }
      if (tag === 'img') { el.removeAttribute('srcset'); el.setAttribute('alt', ''); }
      if (tag === 'canvas' || tag === 'video' || tag === 'audio') el.replaceChildren();
      if (tag === 'input' || tag === 'textarea') el.value = '';
    });
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const texts = []; while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach((t) => { if (t.parentElement && /^(style)$/i.test(t.parentElement.tagName)) return; t.textContent = fakeText(t.textContent); });
    let css = '';
    const blocked = [];
    for (const sh of document.styleSheets) {
      try { for (const r of sh.cssRules) css += r.cssText.replace(/url\((?!["']?data:)[^)]*\)/gi, 'none') + '\n'; }
      catch (e) { blocked.push(safeUrl(sh.href)); }
    }
    const html = '<!doctype html>\n<html class="' + document.documentElement.className + '" lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<title>WhatsApp (fixture sanitizada)</title>\n' +
      '<!-- Gerado por scripts/recon/wa-recon.js em ' + new Date().toISOString() + '. Todo texto, imagem e id foi substituído. -->\n' +
      (blocked.length ? '<!-- Folhas de estilo não capturadas (CORS): ' + blocked.join(' ') + ' -->\n' : '') +
      '<style>\n' + css + '</style>\n</head>\n<body class="' + document.body.className + '">\n' + clone.outerHTML + '\n</body>\n</html>\n';
    return { html, cssBytes: css.length, blockedSheets: blocked };
  };

  const download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  };
  R.save = () => {
    const snap = R.snapshot();
    const report = { meta: { startedAt: R.startedAt, savedAt: new Date().toISOString(), version: R.version, notificationPermission: R.notificationPermission, preloadedAudio: R.preloadedAudio, snapshotCssBytes: snap.cssBytes, snapshotBlockedSheets: snap.blockedSheets }, sound: R.sound, structure: R.structure() };
    download('wa-recon.json', JSON.stringify(report, null, 2), 'application/json');
    setTimeout(() => download('wa-snapshot.html', snap.html, 'text/html'), 800);
    console.log('[holoRecon] salvando wa-recon.json e wa-snapshot.html em Downloads. Eventos de som registrados:', R.sound.filter((e) => e.kind !== 'title').length);
  };
  console.log('[holoRecon] pronto. Receba uma mensagem com outra conversa aberta; depois abra uma conversa e rode holoRecon.save()');
})();
