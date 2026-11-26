/*
 * Único lugar com seletores do WhatsApp usados em JS (spec §5, F8.1).
 * Mapa completo e justificativas: docs/selectors.md. Os seletores de CSS
 * ficam na seção SELECTORS no topo de cada parcial src/theme/_*.css.
 * scripts/check-selectors.mjs (npm run lint) barra seletor fora daqui.
 *
 * Entrada em lista: o primeiro que achar algo vence (reservas). Só tem
 * reserva o que a inspeção viu funcionando; o resto falha quieto e o
 * WhatsApp continua como é (ex.: sem o contador, a bolinha original fica).
 *
 * Carregado nos dois mundos: no isolado (content.js) e no da página, antes
 * do page-hook.js, que copia o que precisa e apaga as globais.
 */
globalThis.HOLO_SEL = Object.freeze({
  main: ['#main'],
  mainFooter: ['#main footer'],
  messagesPanel: ['[data-testid="conversation-panel-messages"]', '#main [role="application"]'],
  msgContainer: '[data-testid="msg-container"]',
  msgRow: '[role="row"]',
  tail: '[data-testid="tail-in"], [data-testid="tail-out"]',
  // Botões do WhatsApp em qualquer idioma: pelo nome interno do ícone
  // (<svg><title>ic-call</title>, medido no WA real em 26/11/2026), com
  // HOLO_SEL_BY_ICON. O rótulo em português/inglês fica de reserva, para o
  // dia em que o WhatsApp renomear os ícones.
  headerButtons: '#main header button',
  voiceCallIcon: 'ic-call',
  voiceCall: ['#main header button[aria-label="Ligação de voz"]', '#main header [aria-label*="voz" i]', '#main header [aria-label*="voice call" i]'],
  // ⋮ do cabeçalho: o único botão dele que abre menu
  headerMenu: ['#main header button[aria-haspopup="menu"]', '#main header button[aria-label="Mais opções"]', '#main header [aria-label*="opções" i]', '#main header [aria-label*="options" i]'],
  // item "Fechar conversa" do menu do cabeçalho
  menuItems: '[role="menu"] [role="menuitem"], [role="application"] li, [role="menu"] li, [role="menu"] [role="button"]',
  closeChatIcon: 'ic-cancel',
  closeChatText: /fechar conversa|close chat/i,
  // botão enviar (só aparece com texto no campo); nome do ícone não medido,
  // então qualquer ícone com "send" no nome
  footerButtons: '#main footer button',
  sendIcon: /(^|-)send(-|$)/,
  // lista de conversas: contador de não lidas ao lado do nome
  sidePane: '#pane-side',
  listRow: '[data-testid="cell-frame-container"]',
  listName: '[data-testid="cell-frame-title"] span[title]', // só para achar o pai; o nome nunca é lido
  unreadBadge: '[data-testid="icon-unread-count"]',
  // tela de ligação (page-hook.js): só voz, vídeo fica intacto
  voiceCallScreen: '[data-testid="voip-container-audio-call"]',
  callTimer: '[data-testid="voip-call-timer"]'
});

/** Nome interno do ícone do WhatsApp num botão ('' se não tiver). */
globalThis.HOLO_SEL_ICON = (el) => {
  const t = el.querySelector('svg > title');
  return t ? t.textContent.trim() : '';
};

/** Primeiro elemento de `selector` cujo ícone tem o nome `name` (texto ou RegExp). */
globalThis.HOLO_SEL_BY_ICON = (selector, name, root = document) => {
  for (const el of root.querySelectorAll(selector)) {
    const n = globalThis.HOLO_SEL_ICON(el);
    if (n && (name instanceof RegExp ? name.test(n) : n === name)) return el;
  }
  return null;
};

/** Primeiro elemento que casa com algum seletor da lista. */
globalThis.HOLO_SEL_FIND = (list, root = document) => {
  for (const s of [].concat(list)) {
    const el = root.querySelector(s);
    if (el) return el;
  }
  return null;
};
