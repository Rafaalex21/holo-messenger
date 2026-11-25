# Mapa de seletores do WhatsApp Web

Fonte da verdade para `src/shared/selectors.js` e para a seção `/* === SELECTORS === */` de cada parcial `src/theme/_*.css` (spec §5).

| Campo | Valor |
|---|---|
| Inspeção | 25/11/2026, Firefox 161 (perfil de recon), WhatsApp Web em pt-BR, tema escuro |
| Ferramenta | `npm run recon` → `scripts/recon/ext/` (relatório e fixture ficam só na máquina: `docs/recon/raw/`, `tests/fixtures/wa-snapshot.html`) |
| Estrutura extraída com | `python -I scripts/recon/outline.py tests/fixtures/wa-snapshot.html <testid...>` |

## 1. O que mudou em relação ao spec

- **`.message-in` e `.message-out` não existem mais.** Também não há `.selectable-text` como classe nem `[role="application"]` na lista de mensagens.
- **O `data-id` das mensagens não começa mais com `true_`/`false_`**, então ele não diz mais quem enviou.
- **Quase todos os `data-icon` sumiram.** Os ícones viraram SVG sem atributo; sobraram só `tail-in`, `tail-out`, `wa-logo` e `wa-wordmark`.
- **Em compensação, há muitos `data-testid` legíveis e estáveis**, e eles passam a ser a base do tema (prioridade 3 do §5).
- **Botões são identificáveis pelo `aria-label`**, em português, porque o WhatsApp segue o idioma do navegador. Esses seletores precisam de fallback em inglês.
- **As classes são todas ofuscadas** (`x1n2onr6`…), no estilo Meta/StyleX, e geradas a cada deploy. Não usar.

## 2. Direção da mensagem (enviada × recebida)

Nada no DOM marca a direção de forma direta em todas as mensagens:

- **`[data-testid="tail-out"]` / `tail-in`:** só aparecem na **primeira** mensagem de uma sequência.
- **Cor de fundo do balão:** o WhatsApp pinta `[data-testid="msg-container"]` com `var(--outgoing-background)` ou `var(--incoming-background)`.

**Decisão:** o `content.js` classifica cada `msg-container` novo comparando o `background-color` calculado com o valor resolvido dessas duas variáveis. Ele grava `data-holo-dir="in|out"` no balão e o CSS do tema usa esse atributo. O rabinho serve de confirmação quando existe. Como a classificação lê a cor do WhatsApp e não a do tema, ela é feita **antes** de o tema sobrescrever as variáveis, ou então comparando com as cores do próprio tema, que já são distintas para cada direção.

## 3. Mapa C1–C24 (spec §7)

Legenda: ✅ confirmado na inspeção · ⚠️ confirmado só em parte · ❓ não estava na tela; confirmar na próxima inspeção.

| # | Parte | Seletor principal | Fallback / observação | |
|---|---|---|---|---|
| C1 | Fundo / papel de parede | `[data-testid="conversation-panel-wrapper"]`, `[data-testid^="conversation-background"]` | `#main [style*="background-image"]` (doodle); variável `--app-background` | ✅ |
| C2 | Lista de conversas | `#pane-side [data-testid="chat-list"]` (`role="grid"`), linhas `[data-testid^="list-item-"]` (`role="row"`) | `#pane-side [role="row"]`; item ativo: `[aria-selected="true"]` | ✅ |
| C2 | Partes da linha | `cell-frame-container`, `cell-frame-title`, `cell-frame-secondary`, `chat-list-timestamp`, `last-msg-status` | todos `data-testid` | ✅ |
| C3 | Badge de não lidas | `[data-testid="icon-unread-count"]` | `#pane-side [aria-label*="não lida" i]`, `[aria-label*="unread" i]` | ✅ |
| C4 | Busca | `[data-testid="chat-list-search-container"] input[type="text"]` | `#side [role="textbox"]` | ✅ |
| C4 | Filtros (Tudo, Não lidas…) | `[data-testid="chat_list_filters_row"] [data-testid="filter-button"] button` | `#all-filter`, `#new-filter` (ids estáveis) | ✅ |
| C5 | Cabeçalho da conversa | `#main header[data-testid="conversation-header"]` | `#main header` | ✅ |
| C5 | Nome do contato | `[data-testid="conversation-info-header-chat-title"]` | `#main header [dir="auto"]` | ✅ |
| C5 | Ligar | `#main header button[aria-label="Ligação de voz"]`, `[aria-label="Ligação de vídeo"]` | `[aria-label*="voz" i]`, `[aria-label*="voice" i]` | ✅ |
| C6/C7 | Linha da mensagem | `#main [data-testid="conversation-panel-messages"] [role="row"]` | `#main [role="row"]` | ✅ |
| C6/C7 | Balão | `[data-testid="msg-container"]` + `data-holo-dir` (§2) | o "rabinho": `[data-testid="tail-in"]`, `[data-testid="tail-out"]` (esconder) | ✅ |
| C6/C7 | Texto | `[data-testid="selectable-text"]` | `.copyable-text[data-pre-plain-text]` (o atributo traz nome e hora: nunca ler) | ✅ |
| C8 | Hora + tiques | `[data-testid="msg-meta"]` | ícones dos tiques sem `data-icon`: estilizar via `msg-meta svg` | ⚠️ |
| C9 | Citação (resposta) | `[data-testid="quoted-message"]` | `[aria-label*="Mensagem citada" i]` | ✅ |
| C10 | Reações | `[data-testid="reaction-bubble"]`, `[data-testid="reaction-bubble-item"]` | `[data-testid="addon-bubble-container"]` | ✅ |
| C11 | Separador de data | ❓ | provavelmente uma linha `[role="row"]` sem `msg-container` | ❓ |
| C12 | Mensagens do sistema (criptografia etc.) | `[data-testid="chatlist-e2e-message"]` (na lista) | na conversa: ❓ | ⚠️ |
| C13 | Remetente em grupos | `[data-testid="author"]` | — | ✅ |
| C14 | Compositor | `#main footer [data-testid="compose-box"]`, campo `[data-testid="conversation-compose-box-input"]` (`role="textbox"`, `contenteditable`) | `#main footer [contenteditable="true"]` | ✅ |
| C15 | Botões do compositor | `footer button[aria-label="Anexar"]`, `[aria-label="Emojis, GIFs, figurinhas"]`, `[aria-label="Mensagem de voz"]` | "Enviar" só aparece com texto digitado: ❓ | ⚠️ |
| C16 | Rodapé CALL/CLOSE | (injetado) — ancorar depois de `#main footer` | — | — |
| C17 | Menus | ❓ (nenhum aberto durante a inspeção) | `[role="menu"]`, `[role="application"] ul` | ❓ |
| C18 | Modais | ❓ | `[role="dialog"]` | ❓ |
| C19 | Painel de informações | `[data-testid="drawer-right"]` | `drawer-left`, `drawer-middle`, `drawer-title-body` | ⚠️ |
| C20 | Mídia | `[data-testid="video-content"]`, `[data-testid="sticker-container"]`, legenda `video-caption` | imagem/áudio/documento: ❓ | ⚠️ |
| C21 | Tela inicial | `[data-testid="wa-web-main-screen"]` | — | ⚠️ |
| C22 | Scrollbars | `#pane-side`, `[data-testid="conversation-panel-messages"]` | — | ✅ |
| C24 | Barra lateral de navegação | `[data-testid="navbar-primary-section"]`, `[data-testid="navbar-footer-section"]` | botões por `aria-label`: "Conversas", "Ligações", "Canais", "Comunidades", "Meta AI" | ✅ |

Outros testids vistos: `chatlist-header`, `drawer-fullscreen`, `wa-wordmark`, `chat-butterbar`, `subgroup-identity`, `mute-notifications-refreshed`, `chat-msg-symbol`, `message-yourself-row`, `chatlist-status-ring`, `you-label`, `conversation-info-header`, `conversation-header-avatar`, `conversation-info-header-button`, `conversation-panel-body`, `wa-square-icon`, `wa-logo`.

`data-tab` vistos: 2, 3, 4, 6, 8, 10, 11 (8 = lista de mensagens, 10 = compositor, 3 = filtros). São números, então frágeis: só como último recurso.

## 4. Variáveis CSS do WhatsApp (F1.2)

O WhatsApp define cerca de 1.550 variáveis em `:root`, `.dark` e `.light` (o tema vem como classe no `<body>`: `body.dark` / `body.light`). Sobrescrever as variáveis abaixo pinta a maior parte do app sem depender de classes. Valores medidos no tema escuro:

| Variável | Valor atual | Onde aparece |
|---|---|---|
| `--app-background` | `#161717` | fundo de `#side`, `#main`, cabeçalho (medido) |
| `--navbar-background` | `#1D1F1F` | barra de navegação |
| `--incoming-background` | `#242626` | balão recebido |
| `--outgoing-background` | `#144D37` | balão enviado |
| `--border-bubble` | `rgba(255,255,255,.1)` | borda do balão |
| `--bubble-meta`, `--bubble-meta-icon` | `rgba(255,255,255,.6)` | hora e tiques |
| `--message-primary` | `#FAFAFA` | texto das mensagens |
| `--primary`, `--primary-strong`, `--primary-stronger` | `#FAFAFA` | texto geral |
| `--input-border`, `--input-border-active` | `#757778`, `#21C063` | campos |
| `--input-placeholder` | `rgba(255,255,255,.6)` | placeholder |
| `--link-rgb` | `83, 189, 235` | links |
| `--panel-background`, `--panel-input-background` | `#111b21`, `#222e35` | painéis antigos / gavetas |
| `--status-ring-unread`, `--badge-pending` | `#008069` | anel de status, pendências |

Fonte do app: `Roboto Variable, Roboto, Helvetica Neue…`.

**Como sobrescrever:** as variáveis vêm de seletores como `:root, .x73z65k` e `.dark`. Para vencer sem guerra de especificidade, o tema declara as variáveis em `:root[data-holo], :root[data-holo] body.dark, :root[data-holo] body.light` com `!important`, que vale para custom properties.

## 5. Pendências para a próxima inspeção

Rodar `npm run recon` de novo com menu, modal, foto, áudio e documento na tela, e com o tema claro, para confirmar os itens ❓ (C11, C12, C15 enviar, C17, C18, C20) e o título `(N) WhatsApp` (ver `docs/sound-investigation.md`).

## 6. Descobertas da F4 (na fixture)

- **Balão:** quem pinta o fundo é o filho `div` do `msg-container` (às vezes 4–5 níveis abaixo, em mídia). O `content.js` acha esse elemento pela cor calculada (`--holo-in-bg` / `--holo-out-bg`) e marca `data-holo-bubble="in|out"`; o contêiner ganha `data-holo-dir` (`none` para figurinhas e outros sem balão).
- **Separador de data:** fica fora das linhas `[role="row"]`, sem `data-testid`, com o fundo de "mensagem do sistema" (`--WDS-systems-bubble-surface-system`, que o tema troca por `--holo-bg-panel`). O `content.js` marca `data-holo-chip="date"`.
- **Aviso de criptografia:** um `button` fora das linhas, dentro de `conversation-panel-messages`.
- **`#main`** é `flex` em coluna e ordena os filhos com `order` (cabeçalho 0, corpo 2, rodapé 3). O papel de parede é absoluto e cobre o `#main` inteiro: o que for injetado precisa de `order` alto e `position: relative` + `z-index`.
- **`drawer-left` fica vazio POR CIMA da lista de conversas.** Pintar o fundo dele esconde a lista inteira: nunca dar `background` aos contêineres `drawer-*`.
- **Busca:** o fundo arredondado fica no avô do `<input>` (`div:has(> div > input)`). **Campo de digitação:** idem, avô de `conversation-compose-box-input`.
- **Navegação lateral:** o botão ativo tem `aria-pressed="true"`; os filtros (`#all-filter`…) também.
- **`wa-web-main-screen`** é o contêiner do app inteiro, não a tela inicial sem conversa: a tela inicial (C21) continua ❓.
