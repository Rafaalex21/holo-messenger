# Spec — Tema "Holo-Messenger" (estilo Cyberpunk 2077) para WhatsApp Web

> Extensão para **Firefox** que muda só o visual do **WhatsApp Web** (`https://web.whatsapp.com/*`) para lembrar o app de mensagens do celular de V em Cyberpunk 2077 e troca o som de notificação por um som escolhido pelo usuário.

| Campo | Valor |
|---|---|
| Codinome | `holo-messenger` |
| Plataforma | Firefox 140+ (desktop), Manifest V3 (140 é o mínimo para `data_collection_permissions`) |
| Escopo de sites | Apenas `https://web.whatsapp.com/*` |
| Uso | Pessoal (instalação própria; sem publicação pública na AMO) |
| Referências visuais | `docs/ref/ref-contacts-panam.png` e `docs/ref/ref-messages-river.png` — capturas do jogo, guardadas só localmente (fora do repositório público, ver `.gitignore`) |
| Painel de etapas | [Holo-Messenger Tracker](https://claude.ai/artifact/UNc7c27o4LHR6ZFWqno653) |

---

## 1. Objetivo

1. Reestilizar o WhatsApp Web inteiro (lista de conversas, cabeçalho, balões, campo de digitação, menus) para parecer a tela **MESSAGES › CONTATO** do jogo.
2. Substituir o som de notificação do WhatsApp Web por um som definido pelo usuário (ex.: o "ping" de mensagem do jogo, fornecido pelo próprio usuário).
3. Não quebrar nada do WhatsApp: tudo continua clicável, legível e acessível; o tema pode ser desligado com um clique.

### Fora do escopo

- Alterar qualquer outro site.
- Mudar comportamento do WhatsApp (enviar mensagens, ler conteúdo, coletar dados). A extensão **não lê nem transmite o conteúdo das conversas**.
- App desktop do WhatsApp (Windows/Mac) — só a versão web no Firefox.
- Chrome/Edge (dá para portar depois; ver §14).

---

## 2. Análise da referência visual

Duas capturas do jogo foram salvas em `docs/ref/`. O que extraímos delas:

### 2.1 Estrutura da tela

```
┌──────────────────────────────────────────────────────────────┐
│ [ícone]  MESSAGES › NOME DO CONTATO                    meta  │  ← breadcrumb em CAIXA ALTA
│ ──────────────────────────────────────────────────────────── │  ← linha vermelha fina
│ ┌────────────────────────────────┐                           │
│ │ mensagem recebida (ciano)      │                           │  ← balão à esquerda
│ └────────────────────────────────┘                           │
│                      ┌────────────────────────────────────┐  │
│                      │ mensagem enviada (amarelo/verde)   │  │  ← balão à direita
│                      └────────────────────────────────────┘  │
│ ──────────────────────────────────────────────────────────── │  ← linha vermelha
│                                     (Y) CALL     (B) CLOSE   │  ← dicas de botão
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Características

| Elemento | Captura "CONTACTS › …" (azul/verde) | Captura "MESSAGES › …" (ciano/amarelo) |
|---|---|---|
| Fundo | quase preto, levemente avermelhado, desfocado | quase preto com vinheta |
| Cabeçalho | texto claro, CAIXA ALTA, condensado, ícone de telefone, seta `›` | idem, em ciano |
| Linha divisória | vermelho/coral fino (1–2 px) | idem |
| Balão recebido | fundo azul-petróleo escuro, borda 1 px ciano claro, texto claro | fundo escuro, borda ciano, texto ciano |
| Balão enviado | fundo verde-água sólido, texto claro | fundo escuro, borda **amarela**, texto amarelo |
| Forma do balão | retângulo, cantos retos, sem "rabinho" | idem |
| Tipografia | sans condensada, peso médio, ~espaçamento normal | idem |
| Rodapé | linha vermelha + dicas de botão "CALL / CLOSE" à direita | idem |
| Extra | leve brilho (glow) nas bordas, texto com aspecto de tela | barra de rolagem fina |

Decisão: oferecer **duas paletas** (o usuário escolhe nas opções):

- **"Ciano/Amarelo"** (padrão) — baseada na captura de mensagens.
- **"Ciano/Verde-água"** — baseada na captura de contatos.

### 2.3 Tokens de design (valores iniciais, ajustar a olho na Fase 3)

```css
:root[data-holo] {
  /* base */
  --holo-bg:            #0b0d10;   /* fundo geral */
  --holo-bg-panel:      #101419;   /* painéis */
  --holo-bg-elev:       #161b22;   /* menus, modais */
  --holo-line:          #ff5a50;   /* linhas vermelhas/coral */
  --holo-line-dim:      #7a2a27;
  --holo-text:          #d8f3f5;   /* texto padrão */
  --holo-text-dim:      #7f9aa0;   /* metadados */

  /* recebido */
  --holo-in-bg:         #0a1c22;
  --holo-in-border:     #5ce1e6;
  --holo-in-text:       #9ff3f6;

  /* enviado — paleta "amarelo" */
  --holo-out-bg:        #15140a;
  --holo-out-border:    #f0d64a;
  --holo-out-text:      #f6e27a;

  /* destaque */
  --holo-accent:        #5ce1e6;   /* ciano */
  --holo-warn:          #f0d64a;   /* amarelo (badges) */
  --holo-danger:        #ff5a50;   /* vermelho */
  --holo-glow:          0 0 6px rgb(92 225 230 / .35);

  /* forma */
  --holo-cut:           10px;      /* tamanho do canto chanfrado */
  --holo-radius:        0;         /* tudo reto */

  /* tipografia */
  --holo-font-ui:       "Rajdhani", "Segoe UI", sans-serif;
  --holo-font-body:     "Rajdhani", "Segoe UI", sans-serif;
  --holo-font-mono:     "Share Tech Mono", ui-monospace, monospace;
}

:root[data-holo][data-holo-palette="teal"] {
  --holo-out-bg:        #12524c;
  --holo-out-border:    #3fb8a8;
  --holo-out-text:      #e6fffb;
}
```

Fontes: **Rajdhani** e **Share Tech Mono** (Google Fonts, licença OFL), **empacotadas dentro da extensão** (`assets/fonts/`). Não usar a fonte nem logotipos oficiais do jogo.

---

## 3. Requisitos

### 3.1 Funcionais

| ID | Requisito |
|---|---|
| RF-01 | O tema é aplicado automaticamente ao abrir `web.whatsapp.com` e **somente** nesse domínio. |
| RF-02 | Liga/desliga do tema pelo popup da extensão, com efeito imediato (sem recarregar a página). |
| RF-03 | Escolha de paleta: "Ciano/Amarelo" ou "Ciano/Verde-água". |
| RF-04 | Lista de conversas, cabeçalho, balões (recebidos/enviados), campo de digitação, menus, modais, mídia e painel de informações seguem o tema. |
| RF-05 | O cabeçalho da conversa aberta mostra `MESSAGES › NOME DO CONTATO` em caixa alta. |
| RF-06 | Barra inferior decorativa com dicas `CALL` e `CLOSE` — opcional; se ativada, `CALL` aciona o botão de chamada de voz do WA e `CLOSE` fecha a conversa (Esc). |
| RF-07 | Efeitos opcionais: scanlines, brilho nas bordas, animação curta de "glitch" quando chega mensagem. |
| RF-08 | O som de notificação do WhatsApp Web é **substituído** por um som da extensão. |
| RF-08b | Ligações: enquanto você liga para alguém (chamando, sem atender) toca `call-outgoing` em loop; enquanto alguém te liga, `call-incoming` em loop. Param junto com o toque original do WhatsApp (atendeu, recusou, desligou). |
| RF-09 | O usuário pode enviar o próprio arquivo de som (mp3/ogg/wav, até 2 MB) na página de opções. |
| RF-10 | Controle de volume (0–100 %) e botão "Testar som". |
| RF-11 | Opção "silenciar som original sem tocar outro" (modo silencioso). |
| RF-12 | Popup mostra o estado do auto-diagnóstico (seletores encontrados / quebrados). |

### 3.2 Não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Permissões mínimas: `storage` + host `https://web.whatsapp.com/*`. Nada de `<all_urls>`, `tabs` ou `webRequest`. |
| RNF-02 | Nenhum dado de conversa é lido, armazenado ou enviado. Sem rede externa (fontes e sons empacotados). |
| RNF-03 | Desempenho: rolar uma conversa com 2.000+ mensagens sem queda perceptível; MutationObserver com trabalho mínimo por mutação. |
| RNF-04 | Legibilidade: contraste de texto ≥ 4.5:1 (WCAG AA) em todas as superfícies. |
| RNF-05 | Respeitar `prefers-reduced-motion` (desliga glitch/animações). |
| RNF-06 | Resiliente a atualizações do WA: seletores centralizados em um único arquivo, com fallbacks; quebra de um seletor degrada só aquela parte. |
| RNF-07 | Emojis, figurinhas, imagens e vídeos continuam com as cores originais (sem filtro). |
| RNF-08 | Funciona com o WA em tema claro **ou** escuro (o tema da extensão se sobrepõe aos dois). |

---

## 4. Arquitetura

```
┌───────────────────────── Firefox ─────────────────────────┐
│                                                           │
│  web.whatsapp.com (aba)                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ MAIN world                                           │ │
│  │   page-hook.js  ── intercepta Audio/play do WA ──┐   │ │
│  │                                                  │   │ │
│  │ ISOLATED world (content script)                  ▼   │ │
│  │   theme/_*.css  (estilos, carregados no início)      │ │
│  │   content.js    (liga/desliga, breadcrumb, rodapé,   │ │
│  │                  observer, diagnóstico, ponte) ──┐   │ │
│  └──────────────────────────────────────────────────┼───┘ │
│                                                     │     │
│  background.js (event page) ◄── runtime.sendMessage ┘     │
│    - toca o som (new Audio) fora da CSP do WA             │
│    - guarda/lê configurações em storage.local             │
│                                                           │
│  options.html / popup.html  ── storage.local ──►  ao vivo │
└───────────────────────────────────────────────────────────┘
```

### 4.1 Componentes

| Arquivo | Mundo | Quando | Função |
|---|---|---|---|
| `src/theme/_*.css` | — | `document_start` | Todo o visual, aplicado só quando `<html data-holo>` existe. Parciais listados em ordem no manifest (`_fonts`, `_tokens`, `_utils`, `_base`, depois os de componentes). |
| `src/content/content.js` | ISOLATED | `document_start` | Lê config, põe `data-holo`/`data-holo-palette` no `<html>`, injeta breadcrumb e rodapé, observa DOM, roda diagnóstico, recebe eventos do hook e repassa ao background. |
| `src/content/page-hook.js` | **MAIN** | `document_start` | Sobrescreve `HTMLMediaElement.prototype.play` (e, se preciso, `AudioBufferSourceNode.start` / `Notification`) para reconhecer e silenciar o som de notificação do WA, avisando o content script via `CustomEvent`. |
| `src/background/background.js` | — | evento | Toca o som escolhido (`new Audio(blobURL)`), volume, valores padrão. |
| `src/options/*` | — | — | Página de opções. |
| `src/popup/*` | — | — | Atalho liga/desliga, paleta, testar som, diagnóstico. |
| `src/shared/selectors.js` | — | — | **Único** lugar com seletores do WA. |
| `src/shared/config.js` | — | — | Valores padrão e esquema da configuração. |

### 4.2 Rascunho do `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Holo-Messenger: tema para WhatsApp Web",
  "version": "0.1.0",
  "description": "Tema estilo Cyberpunk 2077 e som de notificação personalizado para o WhatsApp Web.",
  "browser_specific_settings": {
    "gecko": {
      "id": "holo-messenger@local",
      "strict_min_version": "140.0",
      "data_collection_permissions": { "required": ["none"] }
    }
  },
  "permissions": ["storage"],
  "host_permissions": ["https://web.whatsapp.com/*"],
  "background": { "scripts": ["src/background/background.js"] },
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"],
      "js": ["src/content/page-hook.js"],
      "run_at": "document_start",
      "world": "MAIN"
    },
    {
      "matches": ["https://web.whatsapp.com/*"],
      "css": ["src/theme/_fonts.css", "src/theme/_tokens.css", "src/theme/_utils.css", "src/theme/_base.css", "…parciais da F4"],
      "js": ["src/shared/config.js", "src/shared/selectors.js", "src/content/content.js"],
      "run_at": "document_start"
    }
  ],
  "web_accessible_resources": [
    { "resources": ["assets/fonts/*"], "matches": ["https://web.whatsapp.com/*"] }
  ],
  "action": { "default_popup": "src/popup/popup.html", "default_icon": "assets/icons/icon-32.png" },
  "options_ui": { "page": "src/options/options.html", "open_in_tab": true },
  "icons": { "48": "assets/icons/icon-48.png", "96": "assets/icons/icon-96.png" }
}
```

Notas:
- `world: "MAIN"` em `content_scripts` exige Firefox 128+. Fallback para versões antigas: `window.wrappedJSObject` + `exportFunction` a partir do content script isolado.
- `data_collection_permissions: ["none"]` é exigido pela Mozilla para extensões novas enviadas à AMO (inclusive assinatura unlisted).
- Fontes referenciadas no CSS por URL relativa (`../../assets/fonts/…`): o Firefox resolve a partir do endereço `moz-extension://` da folha de estilo. `assets/fonts/*.woff2` fica em `web_accessible_resources` só para o WhatsApp (F3).

---

## 5. Estratégia de seletores (a parte mais frágil)

O WhatsApp Web usa classes **ofuscadas** que mudam a cada deploy (`x1n2onr6`, `_ak8l` etc.). **Nunca** basear o tema nelas. Ordem de preferência:

1. **IDs estáveis:** `#app`, `#side`, `#pane-side`, `#main`.
2. **ARIA / roles:** `[role="grid"]`, `[role="row"]`, `[role="listitem"]`, `[role="button"][aria-label]`, `header`, `footer`.
3. **Atributos semânticos:** `[data-id]` (linhas de mensagem), `[data-icon="..."]` (ícones), `[contenteditable="true"][data-tab]` (composer), `[data-testid]` onde ainda existir.
4. **Classes semânticas antigas que o WA mantém:** `.message-in`, `.message-out`, `.selectable-text`, `.copyable-text`, `.copyable-area`.
5. **Variáveis CSS do próprio WA** (ex.: cores de fundo de painel/balões): sobrescrever no `:root`/`body` quando existirem — muda muita coisa com pouco código.
6. **Estrutura relativa** (`#main header > div:first-child`) — só como último recurso, sempre com fallback.

Regras:
- Todo seletor fica em `src/shared/selectors.js` (para JS) e numa seção marcada `/* === SELECTORS === */` no topo de cada parcial `src/theme/_*.css`.
- Cada seletor crítico tem **nome**, **seletor principal**, **fallbacks** e **criticidade** (crítico / cosmético).
- O diagnóstico (§10) testa os críticos e mostra no popup quais falharam.
- Documentar o mapa real em `docs/selectors.md` na Fase 1 (o DOM do WA muda; o mapa é a fonte da verdade).

Estrutura em `selectors.js`:

```js
export const SEL = {
  app:          { q: ['#app'], critical: true },
  sidebar:      { q: ['#side', '[data-testid="chatlist"]'], critical: true },
  chatList:     { q: ['#pane-side [role="grid"]', '#pane-side'], critical: true },
  main:         { q: ['#main'], critical: true },
  chatHeader:   { q: ['#main header'], critical: true },
  chatTitle:    { q: ['#main header [dir="auto"][title]', '#main header span[dir="auto"]'], critical: false },
  msgIn:        { q: ['.message-in'], critical: true },
  msgOut:       { q: ['.message-out'], critical: true },
  bubbleTail:   { q: ['[data-icon="tail-in"]', '[data-icon="tail-out"]'], critical: false },
  composer:     { q: ['footer [contenteditable="true"]'], critical: true },
  voiceCallBtn: { q: ['#main header [aria-label*="oz" i]', '#main header [data-icon="voice-call"]'], critical: false }
};
```

(Os valores acima são o ponto de partida; a Fase 1 confirma/ajusta cada um no DOM real.)

> **Atualização F1 (25/11/2026):** a inspeção mostrou que `.message-in`/`.message-out` e quase todos os `data-icon` **não existem mais**, e que o `data-id` não indica mais a direção. A base passa a ser `data-testid` (`msg-container`, `conversation-header`, `cell-frame-title`, `compose-box`…), o `aria-label` e as variáveis CSS do WhatsApp (`--incoming-background`, `--outgoing-background`, `--app-background`…). A direção do balão é detectada pela cor calculada. O mapa completo está em [docs/selectors.md](docs/selectors.md).

---

## 6. Design system

### 6.1 Princípios
- **Cantos retos** em tudo; balões com **um canto chanfrado** via `clip-path` (assinatura visual do jogo).
- **Linhas finas** vermelhas como separadores; bordas de 1 px com brilho leve.
- **Caixa alta** em títulos, rótulos, nomes de contato, cabeçalhos de seção.
- **Fundo escuro** com vinheta; scanlines bem sutis (opcional).
- Conteúdo de mídia (fotos, vídeos, figurinhas, emojis) **sem filtros**.

### 6.2 Utilitários CSS

```css
/* canto chanfrado — recebido: corta canto superior esquerdo */
:root[data-holo] .message-in  .holo-bubble { clip-path: polygon(var(--holo-cut) 0, 100% 0, 100% 100%, 0 100%, 0 var(--holo-cut)); }
/* enviado: corta canto superior direito */
:root[data-holo] .message-out .holo-bubble { clip-path: polygon(0 0, calc(100% - var(--holo-cut)) 0, 100% var(--holo-cut), 100% 100%, 0 100%); }
```

Observação: `clip-path` corta também a borda. Para manter a borda contínua no chanfro, usar a técnica de **duas camadas** (pseudo-elemento `::before` com a cor da borda + fundo interno com `inset: 1px` e o mesmo `clip-path`) ou um `background` com `linear-gradient` diagonal no canto. Escolher na Fase 3 a que renderiza melhor.

```css
/* scanlines */
:root[data-holo][data-holo-fx~="scan"] #app::after {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 9999;
  background: repeating-linear-gradient(to bottom, rgb(255 255 255 / .025) 0 1px, transparent 1px 3px);
}
@media (prefers-reduced-motion: reduce) { :root[data-holo] * { animation: none !important; transition: none !important; } }
```

### 6.3 Elementos injetados (DOM extra, mínimo)
O CSS faz quase tudo. O `content.js` só injeta:
1. **Breadcrumb** `MESSAGES ›` antes do nome do contato no cabeçalho (via `::before` quando possível; elemento real só se precisar).
2. **Rodapé decorativo** com `CALL` / `CLOSE` (RF-06), posicionado acima ou abaixo do composer.
3. Classe auxiliar `holo-bubble` no contêiner do balão (se não der para atingi-lo só com CSS).

Todo elemento injetado tem prefixo `holo-` e é removido quando o tema é desligado.

---

## 7. Mapeamento componente a componente

| # | Parte do WhatsApp Web | Visual alvo | Como |
|---|---|---|---|
| C1 | Fundo geral / papel de parede da conversa | Preto com vinheta avermelhada; esconder o padrão de doodles do WA | CSS: `background` no `#app` e no contêiner da conversa; `background-image: none` no doodle |
| C2 | Barra lateral (lista de conversas) | Painel "CONTACTS": nomes em CAIXA ALTA ciano, prévia em cinza-azulado, item ativo com barra vertical vermelha à esquerda e fundo levemente mais claro | CSS em `#side`, `[role="listitem"]`/`[role="row"]`, `[aria-selected="true"]` |
| C3 | Badge de não lidas | Quadrado amarelo, texto preto, mono | CSS no span do contador (aria-label "não lidas") |
| C4 | Barra de busca / filtros (Tudo, Não lidas, Grupos) | Campo reto com borda ciano; chips como abas retangulares | CSS |
| C5 | Cabeçalho da conversa | `☎ MESSAGES › NOME` em caixa alta, linha vermelha embaixo, status ("online", "digitando…") em mono pequeno | CSS + breadcrumb |
| C6 | Balão recebido | Fundo `--holo-in-bg`, borda 1 px `--holo-in-border`, texto `--holo-in-text`, canto chanfrado, sem rabinho | CSS em `.message-in` |
| C7 | Balão enviado | Fundo/borda/texto `--holo-out-*`, canto chanfrado, sem rabinho | CSS em `.message-out` |
| C8 | Hora + ticks | Mono pequeno, `--holo-text-dim`; tick azul vira ciano brilhante | CSS |
| C9 | Mensagem citada (resposta) | Bloco interno com borda esquerda vermelha | CSS |
| C10 | Reações | Pílula vira retângulo com borda | CSS |
| C11 | Separador de data ("HOJE") | Linha vermelha com rótulo central em mono | CSS |
| C12 | Mensagens do sistema (criptografia, entrou no grupo) | Texto mono, amarelo escuro, sem fundo | CSS |
| C13 | Nome do remetente em grupos | Mantém a cor do WA (identifica pessoas), mas em CAIXA ALTA | CSS |
| C14 | Composer (campo de digitação) | Barra escura, borda superior vermelha, placeholder em caixa alta, cursor ciano | CSS em `footer` |
| C15 | Botões (anexar, emoji, enviar, mic) | Ícones em ciano; enviar em amarelo | CSS em `[data-icon]` (`fill`/`color`) |
| C16 | Rodapé decorativo | Linha vermelha + `(Y) CALL  (B) CLOSE` à direita | Injetado |
| C17 | Menus suspensos / contexto | Fundo `--holo-bg-elev`, borda ciano, itens CAIXA ALTA, hover com barra vermelha | CSS em `[role="application"] ul`, `[role="menu"]` |
| C18 | Modais / diálogos | Moldura com cantos chanfrados, título em caixa alta | CSS em `[role="dialog"]` |
| C19 | Painel de informações do contato | Mesmo estilo de painel | CSS |
| C20 | Mídia (imagem, vídeo, documento, áudio) | Moldura fina, sem filtro; player de áudio com barra ciano | CSS |
| C21 | Tela inicial (sem conversa aberta) | Texto "NO ACTIVE CONNECTION" estilizado / esconder ilustração | CSS (`::after`) |
| C22 | Scrollbars | 6 px, trilho escuro, polegar vermelho | CSS `scrollbar-color` / `scrollbar-width` |
| C23 | Seleção de texto | Fundo ciano 30 % | CSS `::selection` |
| C24 | Barra de navegação lateral (ícones Conversas, Status, Canais…) | Coluna escura, ícone ativo com moldura vermelha | CSS |

---

## 8. Som de notificação

### 8.1 Investigação (Fase 1)
Descobrir **como** o WA Web toca o som hoje. Passos no DevTools do Firefox com o WA aberto:
1. Aba **Rede** → filtrar por **Mídia** → receber uma mensagem com a aba em segundo plano/outra conversa aberta → anotar URL e tipo do arquivo (`.mp3`/`.ogg`).
2. **Depurador** → *Event Listener Breakpoints* não cobre `play()`; então no console, antes de receber a mensagem:
   ```js
   const _play = HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play = function () { console.trace('[WA SOUND]', this.currentSrc || this.src); return _play.apply(this, arguments); };
   ```
   Se não aparecer nada, repetir para `AudioBufferSourceNode.prototype.start` (Web Audio).
3. Verificar se as notificações do sistema (`Notification`) tocam som do Windows por cima.
4. Registrar o resultado em `docs/sound-investigation.md`.

> **Resultado da F1 (25/11/2026):** o WhatsApp usa `new Audio("https://static.whatsapp.net/rsrc.php/yW/r/BS_BUUXbKq5.mp3")`, fora do DOM, e chama `.play()` a cada notificação por uma função `playSound`. Não usa Web Audio. O plano A vale como está. Detalhes e regra de detecção em [docs/sound-investigation.md](docs/sound-investigation.md).

### 8.2 Estratégia (em camadas)

| Plano | Como funciona | Quando usar |
|---|---|---|
| **A — Interceptar** (principal) | `page-hook.js` (mundo MAIN, `document_start`) envolve `HTMLMediaElement.prototype.play`. Se o `src` corresponde ao padrão do som de notificação do WA, **não toca** (retorna `Promise.resolve()`), e dispara `window.dispatchEvent(new CustomEvent('holo:notify'))`. O content script escuta e manda `runtime.sendMessage({type:'play-sound'})` ao background. | Se a investigação mostrar `<audio>`/`new Audio()` |
| **A' — Web Audio** | Mesmo princípio, envolvendo `AudioBufferSourceNode.prototype.start` e identificando o buffer pelo `fetch`/`decodeAudioData` da URL do som. | Se o WA usar Web Audio |
| **B — Detectar por título** (fallback) | O usuário desliga os sons nas configurações do próprio WA. O content script observa `document.title` (`"(3) WhatsApp"`); quando o número **sobe**, toca o som da extensão. | Se A/A' quebrarem após atualização do WA |
| **C — Notificação do sistema** (opcional) | Envolver `window.Notification` para forçar `silent: true` e evitar som duplo do Windows. | Se houver som duplicado |

Padrão para reconhecer o som do WA: guardar em `selectors.js` uma lista `SOUND_URL_PATTERNS` (ex.: regex sobre o nome do arquivo descoberto na investigação) — atualizável sem mexer no resto.

### 8.3 Reprodução
- O som toca no **content script com Web Audio**: os bytes do arquivo (pedidos ao background) viram `AudioBuffer` via `decodeAudioData`. Nenhum elemento de mídia carrega URL na página, então a CSP do WhatsApp (`media-src`) não entra; e `AudioBufferSourceNode.loop` dá loop **sem emenda** para os toques de ligação (o `<audio loop>` com MP3 deixa um silêncio a cada volta). *(Revisado na F6: o plano antigo tocava no background, mas o event page do MV3 pode ser descarregado no meio de um toque longo.)*
- Sons inclusos (decisão de 25/11/2026, ver §8.4): `assets/sounds/message.mp3`, `call-outgoing.mp3`, `call-incoming.mp3`.
- Ligações: o `page-hook.js` espelha o ciclo de vida do toque do WhatsApp (`play` → começa o nosso em loop; `pause`/`ended`/troca de `src` → para). Os padrões de URL dos toques saem da inspeção de ligações (F6.0).
- Ligação feita: o "chamando" do WhatsApp vem no áudio da chamada (WebRTC), não de arquivo. Enquanto a tela de ligação de voz está aberta sem cronômetro, o elemento da chamada fica mudo e o `call-outgoing` toca; ao atender, desligar ou em 70 s no máximo, o som da chamada volta. Detalhes em `docs/sound-investigation.md` §Ligações.
- Som do usuário: enviado na página de opções → validado (tipo `audio/*`, ≤ 2 MB, duração ≤ 5 s) → salvo em `storage.local` como `ArrayBuffer`/data URL → o background cria `Blob` + `URL.createObjectURL` e reaproveita.
- **Antispam:** no máximo 1 som a cada 1,5 s (rajadas de mensagens em grupo).
- Volume aplicado via `audio.volume`.

### 8.4 Sobre o som do jogo
O áudio do Cyberpunk 2077 é propriedade da CD PROJEKT RED. **Decisão do dono do projeto (25/11/2026):** os três sons vão junto com a extensão e no repositório, para quem baixar já ter tudo pronto. Riscos aceitos: pedido de remoção (DMCA) do repositório e recusa numa listagem da AMO. Mitigação: `assets/sounds/NOTICE.md` registra a origem, e a extensão não depende dos arquivos (modo "WhatsApp" e som próprio pelas opções), então retirá-los não quebra nada.

---

## 9. Opções e popup

### 9.1 Configuração (`storage.local`, chave `holo:config`)

```js
{
  enabled: true,
  palette: 'yellow',        // 'yellow' | 'teal'
  fx: { scanlines: true, glow: true, glitch: true },
  footerHints: true,        // rodapé CALL / CLOSE
  buttonLayout: 'xbox',     // glifos do rodapé: 'xbox' (Y / B) | 'playstation' (△ / ○)
  breadcrumb: true,
  sound: {
    mode: 'custom',         // 'custom' | 'default' | 'silent' | 'whatsapp' (não mexe)
    volume: 0.8,
    customName: null,       // nome do arquivo enviado
    // o arquivo em si fica em 'holo:sound' (separado, para não carregar sempre)
  },
  soundStrategy: 'auto'     // 'auto' (A→B) | 'intercept' | 'title'
}
```

### 9.2 Popup (≈ 280 px)
- Interruptor **TEMA ON/OFF**.
- Paleta: dois botões.
- Botões do rodapé: **Microsoft (Y / B)** ou **Sony (△ / ○)**.
- Som: modo + volume + **Testar**.
- Linha de status do diagnóstico: `● 9/9 seletores OK` ou `▲ 2 quebrados — ver opções`.
- O próprio popup com o visual do tema.

### 9.3 Página de opções
Tudo do popup + upload de som (com prévia), efeitos individuais, estratégia de som, lista detalhada do diagnóstico, botão "restaurar padrões".

Mudanças são aplicadas **ao vivo** via `storage.onChanged` no content script (troca de atributos em `<html>`).

---

## 10. Resiliência e diagnóstico

- `content.js` espera o WA montar (`#app` com filhos, ou `#side` presente) usando `MutationObserver` no `document.documentElement`, depois reduz o observer para `#main`/`#pane-side`.
- Observer só faz trabalho barato: marcar `holo-bubble`, garantir breadcrumb. Usar `requestAnimationFrame` para agrupar mutações.
- **Diagnóstico** roda 5 s depois de carregar e a cada troca de conversa: testa cada seletor crítico de `SEL`; grava resultado em `storage.session`/`local` (`holo:health`) para o popup ler.
- Se um seletor crítico de balão falhar, o tema **continua** aplicado no resto (degradação graciosa).
- Desligar o tema remove `data-holo` → todo o CSS para de valer (todas as regras ficam sob `:root[data-holo]`).

---

## 11. Estrutura de pastas

```
Tema Cyberpunk 2077/
├─ spec.md
├─ README.md
├─ package.json              # scripts: dev, lint, build, test
├─ manifest.json
├─ src/
│  ├─ background/background.js
│  ├─ content/content.js
│  ├─ content/page-hook.js
│  ├─ shared/config.js
│  ├─ shared/selectors.js
│  ├─ theme/
│  │  ├─ _fonts.css          # @font-face; ordem no manifest: fonts, tokens, utils, base, componentes
│  │  ├─ _tokens.css
│  │  ├─ _utils.css          # chanfro, linhas, glow
│  │  ├─ _base.css
│  │  ├─ _sidebar.css
│  │  ├─ _conversation.css
│  │  ├─ _composer.css
│  │  ├─ _overlays.css       # menus, modais, tooltips
│  │  └─ _fx.css             # scanlines, glitch, reduced-motion
│  ├─ popup/popup.html|css|js
│  └─ options/options.html|css|js
├─ assets/
│  ├─ fonts/  (Rajdhani, Share Tech Mono + OFL.txt)
│  ├─ sounds/default-blip.ogg
│  └─ icons/  (16, 32, 48, 96)
├─ tests/
│  ├─ fixtures/wa-snapshot.html   # DOM do WA sanitizado (sem conteúdo pessoal)
│  ├─ theme.spec.ts               # Playwright: screenshots
│  └─ sound-hook.spec.ts          # Playwright: hook de som
└─ docs/
   ├─ ref/            (capturas do jogo)
   ├─ selectors.md    (mapa real do DOM — Fase 1)
   └─ sound-investigation.md
```

Observação sobre `@import`: content scripts CSS não resolvem `@import` relativo de forma confiável. Em vez de concatenar no build, o manifest lista os parciais em ordem em `content_scripts[].css` (decidido na F3).

---

## 12. Plano de execução — fases e etapas

Cada etapa tem um ID usado no painel de acompanhamento. **Critério de aceite** em itálico.

### F0 — Preparação
- **F0.1** Instalar Firefox Developer Edition (aceita extensões sem assinatura) e Node.js LTS. *`node -v` e Dev Edition abrindo.*
- **F0.2** `npm init -y` e `npm i -D web-ext @playwright/test`. *`npx web-ext --version` responde.*
- **F0.3** Criar a estrutura de pastas do §11 e `git init` com `.gitignore` (`node_modules/`, `web-ext-artifacts/`). *Primeiro commit feito.*
- **F0.4** Guardar as capturas de referência em `docs/ref/`. *Feito.*

### F1 — Reconhecimento do WhatsApp Web
- **F1.1** Mapear seletores estáveis (§5) no DOM atual → `docs/selectors.md`. *Cada item da tabela C1–C24 tem um seletor ou "sem seletor estável".*
- **F1.2** Listar variáveis CSS que o WA define (claro e escuro) e quais controlam fundo/balões. *Lista em `docs/selectors.md`.*
- **F1.3** Investigar o som de notificação (§8.1). *`docs/sound-investigation.md` com URL/padrão e API usada.*
- **F1.4** Salvar um snapshot do DOM sanitizado (trocar nomes/textos por fictícios, remover imagens) em `tests/fixtures/wa-snapshot.html`. *Fixture abre no navegador com estrutura parecida.*

### F2 — Esqueleto da extensão
- **F2.1** Escrever `manifest.json` (§4.2) com host só do WA. *`web-ext lint` sem erros.*
- **F2.2** Rodar com `npx web-ext run --firefox=firefoxdeveloperedition --start-url https://web.whatsapp.com` (ou `about:debugging` → Carregar temporário). *Extensão aparece carregada.*
- **F2.3** CSS de prova (`:root[data-holo] #app { outline: 3px solid red }`). *Borda aparece no WA e em nenhum outro site.*
- **F2.4** `content.js` põe/tira `data-holo` no `<html>` conforme `storage`. *Alternar no console do background liga/desliga a borda sem recarregar.*

### F3 — Design system
- **F3.1** `_tokens.css` com as duas paletas (§2.3). *Trocar `data-holo-palette` muda as cores.*
- **F3.2** Fontes locais via `@font-face` (Rajdhani 500/600/700, Share Tech Mono). *Aba Fontes do inspetor mostra as fontes da extensão.*
- **F3.3** Utilitários: canto chanfrado com borda contínua, linhas, glow. *Página de teste com os três utilitários renderizando certo.*
- **F3.4** Base global: fundo, cor de texto, scrollbars, `::selection`, links. *Nenhuma área branca/verde do WA sobrando no layout principal.*

### F4 — Componentes (tabela §7)
- **F4.1** Barra lateral e lista de conversas (C2–C4, C24). *Item ativo com barra vermelha; badge amarelo.*
- **F4.2** Cabeçalho da conversa com `MESSAGES › NOME` (C5). *Breadcrumb aparece e acompanha a troca de conversa.*
- **F4.3** Balões recebidos (C6). *Igual à referência: borda ciano, canto chanfrado, sem rabinho.*
- **F4.4** Balões enviados nas duas paletas (C7). *Amarelo e verde-água funcionando.*
- **F4.5** Metadados: hora, ticks, citação, reações, separador de data, mensagens do sistema, nomes em grupo (C8–C13). *Nada ilegível em conversa de grupo.*
- **F4.6** Composer e botões (C14–C15). *Digitar, anexar, emoji e áudio funcionam e estão no tema.*
- **F4.7** Rodapé decorativo `CALL / CLOSE` (C16, RF-06). *Cliques acionam chamada/fecham conversa; some quando desativado.*
- **F4.8** Menus, modais, tooltips, painel de info (C17–C19). *Menu de contexto de mensagem e "Dados do contato" no tema.*
- **F4.9** Mídia e tela inicial (C20–C21). *Fotos sem filtro; player de áudio no tema.*

### F5 — Efeitos e polimento
- **F5.1** Animação "glitch" curta (≤ 250 ms) em mensagem nova recebida. *Só em mensagens que chegam, não ao rolar histórico.*
- **F5.2** Scanlines e glow opcionais. *Ligam/desligam pelas opções.*
- **F5.3** `prefers-reduced-motion` + revisão de contraste (RNF-04/05). *Contraste ≥ 4.5:1 medido no inspetor de acessibilidade.*

### F6 — Som de notificação
- **F6.1** `page-hook.js` no mundo MAIN interceptando o som do WA (plano A ou A'). *Som do WA não toca; evento `holo:notify` aparece no console.*
- **F6.2** Criar o som padrão original `default-blip.ogg`. *Arquivo ≤ 30 KB, ~300 ms.*
- **F6.3** Upload de som nas opções com validação (tipo, 2 MB, 5 s). *Arquivo inválido mostra erro; válido fica salvo após reiniciar o Firefox.*
- **F6.4** Background toca o som com volume e antispam (1,5 s). *Teste com 5 mensagens seguidas → 1 som.*
- **F6.5** Fallback por título (plano B) + modo `auto`. *Com o hook desativado, som ainda toca quando `(N)` sobe.*
- **F6.6** (Opcional) `Notification` com `silent: true` (plano C). *Sem som duplicado do Windows.*

### F7 — Opções e popup
- **F7.1** Página de opções completa (§9.3). *Todas as chaves de config editáveis.*
- **F7.2** Popup (§9.2). *Liga/desliga e testar som funcionam.*
- **F7.3** Aplicação ao vivo via `storage.onChanged`. *Mudar paleta no popup muda a aba aberta na hora.*

### F8 — Resiliência
- **F8.1** `selectors.js` com fallbacks e criticidade para todos os itens usados. *Nenhum seletor fora desse arquivo / da seção do CSS.*
- **F8.2** Diagnóstico no popup (RF-12). *Quebrar um seletor de propósito → popup avisa.*
- **F8.3** Observer com `requestAnimationFrame` e escopo reduzido (RNF-03). *Rolagem de conversa longa sem travar (perfilador: < 4 ms por frame no script da extensão).*

### F9 — Testes
- **F9.1** Playwright (Firefox) abrindo a fixture, injetando os CSS do tema (lista do manifest) + `content.js` e comparando screenshots (claro/escuro, duas paletas). *`npx playwright test` verde.*
- **F9.2** Teste do hook de som na fixture: `new Audio(<url do WA>).play()` não toca e dispara `holo:notify`. *Teste verde.*
- **F9.3** Checklist manual no WA real (§13.2). *Todos os itens marcados.*
- **F9.4** `npx web-ext lint` limpo. *0 erros, 0 avisos relevantes.*

### F10 — Entrega
- **F10.1** `npx web-ext build` gera o `.zip`. *Arquivo em `web-ext-artifacts/`.*
- **F10.2** Assinar como **unlisted** na AMO (`web-ext sign --channel=unlisted`, precisa de chave de API da AMO criada pelo próprio usuário) **ou** usar Dev Edition com `xpinstall.signatures.required = false`. *`.xpi` instalável.*
- **F10.3** Instalar no Firefox do dia a dia e escrever `README.md` (instalar, trocar som, desligar, o que fazer quando o WA atualizar). *README cobre os 4 tópicos.*

---

## 13. Testes

### 13.1 Automatizados (Playwright)
- **Por que fixture e não o WA real:** o WA exige login por QR code e muda o DOM sem aviso; testes contra ele seriam instáveis e envolveriam dados pessoais. A fixture é um snapshot sanitizado do DOM real (F1.4), atualizado sempre que o mapa de seletores mudar.
- Os testes injetam os CSS do tema e o `content.js` (com um stub de `browser.storage`) na fixture e verificam: atributos no `<html>`, cores computadas de balões, presença do breadcrumb, screenshots de referência.
- O hook de som é testado chamando `play()` com a URL do padrão e verificando que o evento foi disparado e o áudio não tocou.

### 13.2 Checklist manual (WA real)
- [ ] Conversa individual: enviar/receber texto, emoji, figurinha, foto, áudio, documento.
- [ ] Grupo: nomes coloridos legíveis, menções, respostas citadas, reações.
- [ ] Menu de contexto de mensagem, menu "⋮", modal de encaminhar, "Dados do contato".
- [ ] Busca de conversas e filtros.
- [ ] Status / Canais / Comunidades abrem sem área quebrada.
- [ ] WA em tema claro e escuro.
- [ ] Som: aba em segundo plano, outra conversa aberta, rajada de mensagens, volume 0 e 100.
- [ ] Desligar tema pelo popup volta ao WA original sem recarregar.
- [ ] Outro site qualquer (ex.: wikipedia.org) sem nenhuma alteração.

---

## 14. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| WA muda DOM/classes | Alta | Médio | Seletores estáveis (§5), arquivo único, diagnóstico, fixture atualizável |
| WA muda forma de tocar som | Média | Médio | Planos A/A'/B em camadas, modo `auto` |
| CSP do WA bloqueia fontes/sons | Média | Baixo | Fontes como recurso da extensão; som toca no background |
| `world: MAIN` indisponível | Baixa | Médio | Exigir Firefox 128+; fallback `wrappedJSObject`/`exportFunction` |
| Tema deixa algo ilegível | Média | Médio | Revisão de contraste (F5.3), checklist manual |
| Desempenho em chats longos | Baixa | Médio | CSS faz o grosso; observer mínimo; perfilar (F8.3) |
| Porta para Chrome no futuro | — | — | MV3 já é compatível; trocar `browser.*` por polyfill e `background.scripts` por `service_worker` (som via offscreen document) |

---

## 15. Questões legais / propriedade intelectual

- "Cyberpunk 2077", seus sons, fontes, logos e personagens são da CD PROJEKT RED; "WhatsApp" é marca da Meta.
- Este projeto é um **tema de fã inspirado** no estilo visual do jogo: cores, formas e tipografia livres (OFL), sem logos nem imagens do jogo.
- **Exceção:** os três sons em `assets/sounds/` são áudio do jogo, incluídos por decisão do dono do projeto (§8.4), sem fins comerciais e fora da licença do repositório.
- Não publicar como listagem pública na AMO com esses nomes/marcas. Se um dia publicar lá, renomear, retirar referências diretas e trocar os sons por originais.

---

## 16. Definição de pronto (v1.0)

- Todas as etapas F0–F10 concluídas no painel.
- Checklist manual §13.2 100 % marcado.
- Uma semana de uso diário sem quebra visual relevante.

---

**Painel de acompanhamento:** [Holo-Messenger Tracker](https://claude.ai/artifact/UNc7c27o4LHR6ZFWqno653) — 11 fases e 47 etapas (IDs iguais aos do §12). O status de cada etapa pode ser mudado direto no painel.
