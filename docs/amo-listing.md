# Publicação na AMO (addons.mozilla.org)

Tudo o que o formulário de envio pede, pronto para copiar. Distribuição: **no
site (listada)**, grátis.

## Antes de enviar

```
cd "C:\Users\Rafael\Documents\Tema Cyberpunk 2077"
npm.cmd run package
```

Rodar na pasta do projeto (senão o npm não acha o `package.json`). No
PowerShell, `npm.cmd` em vez de `npm`: o Windows bloqueia o `npm.ps1` pela
política de execução de scripts. No cmd, `npm` funciona.

Roda o `web-ext lint` (tem que dar 0 erros e 0 avisos), gera
`web-ext-artifacts/holo-messenger-<versão>.zip` e confere o zip com
`scripts/check-package.mjs`: só entram `manifest.json`, `LICENSE`, `src/` e `assets/`,
nada falta e o diagnóstico de som não volta. Se algo estiver errado, ele para
e diz o arquivo.

As capturas ficam em `web-ext-artifacts/amo/` (fora do git). Saem das páginas
de mentira dos testes, sem nenhuma conversa real.

## Campos do formulário

**Nome:** Holo-Messenger: tema para WhatsApp Web

**Endereço (slug):** holo-messenger

**Resumo** (até 250 caracteres):

> Deixa o WhatsApp Web com cara de celular de Cyberpunk 2077: balões
> chanfrados com moldura neon, scanlines, glitch nas mensagens novas e os sons
> do jogo para mensagem e ligação. Projeto de fã, não oficial.

**Descrição:**

> Tema para o WhatsApp Web inspirado no app de mensagens do celular de
> Cyberpunk 2077.
>
> - Balões com canto chanfrado e moldura fina; recebidos em ciano, enviados
>   em amarelo ou verde-água.
> - Fontes no estilo do jogo, scanlines, brilho e um glitch rápido quando
>   chega mensagem nova (cada efeito liga e desliga no popup).
> - Rodapé com os botões de controle: Microsoft (Y / B) ou Sony (△ / ○).
> - Sons do jogo para mensagem recebida, ligação recebida e "chamando"
>   quando você liga. No popup dá para voltar aos sons do WhatsApp ou deixar
>   tudo mudo, e mudar o volume.
> - Tudo muda na hora, sem recarregar a página.
>
> Privacidade: a extensão não lê suas mensagens, nomes nem números, não manda
> nada para lugar nenhum e não tem servidor. Ela só guarda as suas escolhas
> (paleta, efeitos, som) no próprio Firefox.
>
> Projeto de fã sem fins comerciais. Não é afiliado à CD PROJEKT RED nem ao
> WhatsApp/Meta. Cyberpunk 2077 e os sons do jogo são © CD PROJEKT RED.

### Em inglês

A extensão tem popup em português e inglês (`_locales/`; qualquer outro
idioma do Firefox cai no inglês). Na AMO, a ficha em inglês entra em **Edit
Product Page**, trocando o idioma no seletor do topo do formulário para
English (US).

**Name:** Holo-Messenger: Cyberpunk theme for WhatsApp Web

**Summary:**

> Makes WhatsApp Web look like the phone in Cyberpunk 2077: chamfered
> bubbles with neon frames, scanlines, glitch on new messages and the game's
> sounds for messages and calls. Unofficial fan project.

**Description:**

> A WhatsApp Web theme inspired by the messaging app on the phone in
> Cyberpunk 2077.
>
> - Chamfered bubbles with a thin frame; received in cyan, sent in yellow or
>   teal.
> - Game-style fonts, scanlines, glow and a quick glitch when a new message
>   arrives (each effect can be turned on or off in the popup).
> - Footer with controller buttons: Microsoft (Y / B) or Sony (△ / ○).
> - The game's sounds for incoming messages, incoming calls and "calling"
>   when you call someone. The popup can switch back to WhatsApp's sounds or
>   mute everything, and change the volume.
> - Everything applies instantly, no page reload.
> - Works with WhatsApp in any language; the popup is in English and
>   Brazilian Portuguese.
>
> Privacy: the extension does not read your messages, names or numbers,
> sends nothing anywhere and has no server. It only stores your choices
> (palette, effects, sound) in Firefox itself.
>
> Unofficial, non-commercial fan project. Not affiliated with CD PROJEKT RED
> or WhatsApp/Meta. Cyberpunk 2077 and the game's sounds are © CD PROJEKT RED.

**Categoria:** Aparência

**Tags:** whatsapp, tema, cyberpunk, dark mode

**Site / suporte:** https://github.com/Rafaalex21/holo-messenger (problemas em
`/issues`). E-mail de suporte: deixar em branco.

**Licença:** MIT (decidido em 25/11/2026). Vale só para o código: os sons
ficam de fora (`assets/sounds/NOTICE.md`) e as fontes são OFL. O arquivo
`LICENSE` vai no zip.

**Política de privacidade:** não precisa. O manifest declara
`data_collection_permissions: none`.

**Capturas** (nesta ordem):

1. `1-tema-amarelo.png`: a tela inteira com o tema.
2. `2-baloes-amarelo.png`: balões com citação, lista e reação.
3. `3-baloes-verde-agua.png`: a mesma conversa na paleta verde-água.
4. `4-popup.png`: o popup com paleta, efeitos, botões e som.

## Notas para o revisor (campo "Notes to reviewer")

> No build step, no minified or remote code: the zip is the source.
>
> - `src/content/page-hook.js` runs in the MAIN world at `document_start` on
>   web.whatsapp.com only. It wraps `HTMLMediaElement.prototype.play/pause`
>   to recognise WhatsApp's own notification and ringtone files (matched by
>   file name on static.whatsapp.net) and, when the user picked the game
>   sounds, stops them and fires a `holo:sound` DOM event. For outgoing voice
>   calls it mutes the call's audio element only while the "calling" screen
>   is up without the call timer (max 70 s), so the extension's ringback can
>   play instead. It never reads message text, names or numbers.
> - `src/content/content.js` finds WhatsApp's own buttons (voice call, the
>   header menu, "Close chat", send) by the icon name WhatsApp puts in each
>   button's `<svg><title>` (e.g. `ic-call`), so it works in any UI
>   language. It only clicks them when the user presses the extension's
>   CALL / CLOSE buttons.
> - The same script subclasses `window.Notification` and wraps
>   `ServiceWorkerRegistration.prototype.showNotification` only to add
>   `silent: true` when the user picked the game sounds or mute, so the OS
>   chime does not play on top. Title, body and icon pass through untouched
>   and are never read.
> - `src/content/sound.js` plays the bundled MP3s with Web Audio; the
>   background page is a fallback when the tab has no autoplay permission.
> - Storage: only the user's settings in `storage.local`. No network requests
>   besides loading the extension's own files.
> - The three sounds in `assets/sounds/` are from Cyberpunk 2077
>   (© CD PROJEKT RED), included in a non-commercial fan project; see
>   `assets/sounds/NOTICE.md`. Fonts are OFL (`assets/fonts/OFL.txt`).

## Para lembrar

- **Id da extensão:** `holo-messenger@local`. Depois do primeiro envio não
  muda mais: as atualizações só chegam a quem instalou se o id for o mesmo.
- **Sons:** os três vão na versão da loja, decidido em 25/11/2026. Se a
  Mozilla ou a CD PROJEKT RED pedirem, a saída é tirar os arquivos e deixar o
  modo "WhatsApp" como padrão.
