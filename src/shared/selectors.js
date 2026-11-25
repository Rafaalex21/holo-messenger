/*
 * Único lugar com seletores do WhatsApp usados em JS (spec §5).
 * Mapa completo e justificativas: docs/selectors.md. Os seletores de CSS
 * ficam na seção SELECTORS no topo de cada parcial src/theme/_*.css.
 * Cada entrada é uma lista: o primeiro que achar algo vence (fallbacks).
 */
globalThis.HOLO_SEL = Object.freeze({
  main: ['#main'],
  mainFooter: ['#main footer'],
  messagesPanel: ['[data-testid="conversation-panel-messages"]', '#main [role="application"]'],
  msgContainer: '[data-testid="msg-container"]',
  msgRow: '[role="row"]',
  tail: '[data-testid="tail-in"], [data-testid="tail-out"]',
  // botões do cabeçalho da conversa (pt-BR primeiro, inglês de reserva)
  voiceCall: ['#main header button[aria-label="Ligação de voz"]', '#main header [aria-label*="voz" i]', '#main header [aria-label*="voice call" i]'],
  headerMenu: ['#main header button[aria-label="Mais opções"]', '#main header [aria-label*="opções" i]', '#main header [aria-label*="menu" i]'],
  // item "Fechar conversa" do menu do cabeçalho
  menuItems: '[role="menu"] [role="menuitem"], [role="application"] li, [role="menu"] li, [role="menu"] [role="button"]',
  closeChatText: /fechar conversa|close chat/i
});

/** Primeiro elemento que casa com algum seletor da lista. */
globalThis.HOLO_SEL_FIND = (list, root = document) => {
  for (const s of [].concat(list)) {
    const el = root.querySelector(s);
    if (el) return el;
  }
  return null;
};
