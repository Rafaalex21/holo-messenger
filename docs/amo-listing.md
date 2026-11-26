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

A ficha vai só em inglês. A AMO usa a `default_locale` do manifest (`en`)
como idioma da ficha; o popup continua em português para quem usa o Firefox
em português.

**Name:** Holo-Messenger

(A AMO aceita no máximo 30 caracteres no nome da ficha. O nome do
manifest, "Holo-Messenger: Cyberpunk theme for WhatsApp Web", é o que
aparece no gerenciador de extensões do Firefox e não tem esse limite.)

**Slug:** holo-messenger (o formulário sugere um endereço a partir do nome
antigo: clicar em "Editar" ao lado da URL e trocar)

**Summary** (up to 250 characters):

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

**Category:** Appearance

**Tags:** whatsapp, theme, cyberpunk, dark mode

**Homepage / Support site:** https://github.com/Rafaalex21/holo-messenger
(issues at `/issues`). Support email: leave blank.

**License:** MIT. Covers the code only: the sounds are excluded
(`assets/sounds/NOTICE.md`) and the fonts are OFL. The `LICENSE` file is in
the zip.

**Privacy policy:** not needed. The manifest declares
`data_collection_permissions: none`.

**Icon:** `web-ext-artifacts/amo/icone-128.png` (fora do git): o
`assets/icons/icon.svg` desenhado num PNG de 128 × 128 com fundo
transparente, pelo Firefox do Playwright. A ficha não aceita SVG; a
extensão em si continua usando o SVG.

**Screenshots** (in this order, with these captions):

1. `1-tema-amarelo.png`: The whole WhatsApp Web screen with the theme.
2. `2-baloes-amarelo.png`: Bubbles with a quote, a list and a reaction.
3. `3-baloes-verde-agua.png`: The same chat in the teal palette.
4. `4-popup.png`: The popup: palette, effects, footer buttons and sound.

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
> - The same script subclasses `window.Notification` and wraps
>   `ServiceWorkerRegistration.prototype.showNotification` only to add
>   `silent: true` when the user picked the game sounds or mute, so the OS
>   chime does not play on top. Title, body and icon pass through untouched
>   and are never read.
> - `src/content/content.js` finds WhatsApp's own buttons (voice call, the
>   header menu, "Close chat", send) by the icon name WhatsApp puts in each
>   button's `<svg><title>` (e.g. `ic-call`), so it works in any UI
>   language. It only clicks them when the user presses the extension's
>   CALL / CLOSE buttons.
> - `src/content/sound.js` plays the bundled MP3s with Web Audio; the
>   background page is a fallback when the tab has no autoplay permission.
> - Storage: only the user's settings in `storage.local`. No network requests
>   besides loading the extension's own files.
> - The three sounds in `assets/sounds/` are from Cyberpunk 2077
>   (© CD PROJEKT RED), included in a non-commercial fan project; see
>   `assets/sounds/NOTICE.md`. Fonts are OFL (`assets/fonts/OFL.txt`).

## Para lembrar

- **Id da extensão:** `holo-messenger@rafaalex21.github.io`. Depois do
  primeiro envio não muda mais: as atualizações só chegam a quem instalou se
  o id for o mesmo. O primeiro id (`holo-messenger@local`) ficou bloqueado na
  AMO em 26/11/2026, porque a extensão enviada com ele foi apagada: id de
  extensão apagada não volta a ser aceito.
- **Sons:** os três vão na versão da loja, decidido em 25/11/2026. Se a
  Mozilla ou a CD PROJEKT RED pedirem, a saída é tirar os arquivos e deixar o
  modo "WhatsApp" como padrão.
