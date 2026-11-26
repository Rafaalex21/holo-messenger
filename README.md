# Holo-Messenger

Extensão para o Firefox que deixa o WhatsApp Web com cara do app de mensagens
do celular de **Cyberpunk 2077**: balões com canto chanfrado e moldura neon,
fontes do estilo do jogo, scanlines, glitch nas mensagens novas e os sons do
jogo para mensagem e ligação.

Projeto de fã, sem fins comerciais. Não é afiliado à CD PROJEKT RED nem ao
WhatsApp/Meta.

## Instalar

- **Pela loja do Firefox (AMO):** a página da extensão entra aqui quando a
  revisão da Mozilla aprovar. É o jeito mais fácil e recebe as atualizações
  sozinho.
- **Sem a loja, a partir deste repositório:** veja abaixo.

Precisa do Firefox 140 ou mais novo, no computador. Funciona só em
`web.whatsapp.com`, com o WhatsApp em qualquer idioma. O popup sai em
português ou inglês, conforme o idioma do Firefox (outros idiomas caem no
inglês).

### Instalar sem a loja

O Firefox comum só instala de vez extensões assinadas pela Mozilla, e o
código daqui não vem assinado. Escolha um dos três caminhos:

**1. Temporária, em qualquer Firefox (some ao fechar o navegador).** Bom para
experimentar.

1. Aqui no GitHub: **Code → Download ZIP** e extraia a pasta.
2. No Firefox, abra `about:debugging#/runtime/this-firefox`.
3. **Carregar extensão temporária…** e escolha o `manifest.json` da pasta
   extraída.
4. Abra (ou recarregue) o `web.whatsapp.com`.

**2. De vez, no Firefox Developer Edition, Nightly ou ESR.** Essas versões
deixam desligar a exigência de assinatura (o Firefox comum ignora isso).

1. Em `about:config`, mude `xpinstall.signatures.required` para `false`.
2. Monte o pacote: compacte em .zip o **conteúdo** da pasta (o
   `manifest.json` tem que ficar na raiz do zip, não dentro de outra pasta).
   Quem tem Node.js pode usar `npm install` e `npm run build`, que gera o zip
   em `web-ext-artifacts/`.
3. Em `about:addons`, na engrenagem, **Instalar extensão de arquivo…** e
   escolha o zip (se o seletor só mostrar arquivos `.xpi`, renomeie o zip de
   `.zip` para `.xpi`: é o mesmo formato).

**3. De vez, no Firefox comum, assinada com a sua própria conta.** A Mozilla
assina de graça extensões que não vão para a loja ("unlisted"), em poucos
minutos.

1. Crie uma conta em [addons.mozilla.org](https://addons.mozilla.org) e gere
   uma chave em [Gerenciar chaves de API](https://addons.mozilla.org/developers/addon/api/key/).
2. No `manifest.json`, troque o `id` em `browser_specific_settings.gecko`
   por um seu (ex.: `holo-messenger@seu-usuario`): o id atual pertence à
   extensão publicada na loja, e a Mozilla não assina outra com o mesmo id.
3. Com Node.js instalado, na pasta do projeto:

   ```
   npm install
   npx web-ext sign --channel=unlisted
   ```

   com a chave nas variáveis `WEB_EXT_API_KEY` e `WEB_EXT_API_SECRET` (nunca
   escreva a chave num arquivo do projeto nem faça commit dela).
4. Arraste o `.xpi` que aparece em `web-ext-artifacts/` para uma janela do
   Firefox. Para atualizar, aumente a `version` no `manifest.json` e assine
   de novo.

## Usar

Clique no ícone da extensão na barra do Firefox. Tudo muda na hora, sem
recarregar o WhatsApp.

| Opção | O que faz |
|---|---|
| **Tema** | Liga e desliga tudo. Desligado, o WhatsApp volta ao normal. |
| **Paleta** | Cor dos balões que você manda: amarelo ou verde-água. Os recebidos são sempre ciano. |
| **Efeitos** | Scanlines, brilho e glitch, cada um liga e desliga. Com "reduzir movimento" ligado no sistema, o glitch não roda. |
| **Botões do rodapé** | Os botões CALL / CLOSE embaixo da conversa: Microsoft (Y / B) ou Sony (△ / ○). CALL liga para o contato; CLOSE fecha a conversa. |
| **Som** | **Cyberpunk**: sons do jogo para mensagem, ligação recebida e "chamando". **WhatsApp**: os sons originais. **Mudo**: nenhum som de mensagem nem de toque (o áudio da ligação continua). |
| **Volume** e **▶** | Volume dos sons do jogo e um botão para ouvir cada um. |

Nos modos Cyberpunk e Mudo, as notificações do Windows saem sem som, para
não tocar junto com o som do jogo.

## Privacidade

A extensão não lê suas mensagens, nomes nem números, não manda nada para
lugar nenhum e não tem servidor. Ela só lê cores, atributos e `data-testid`
da página (e os dígitos do contador de não lidas) e guarda as suas escolhas
no próprio Firefox.

## Quando o WhatsApp atualizar

O WhatsApp muda o site de tempos em tempos. Se algo do tema sumir ou ficar
estranho:

1. Desligue o **Tema** no popup: o WhatsApp volta ao normal na hora.
2. Todos os seletores do WhatsApp usados no código ficam em
   `src/shared/selectors.js` (JavaScript) e na lista `=== SELECTORS ===` no
   topo de cada arquivo de `src/theme/` (CSS). O mapa com as reservas e o
   porquê de cada um está em `docs/selectors.md`.
3. Para descobrir o que mudou, `npm run recon` abre um Firefox de inspeção
   (veja `docs/selectors.md` e `docs/sound-investigation.md`).
4. Ajuste o seletor, rode `npm run lint` e `npm test`.

Os botões do WhatsApp que o rodapé CALL / CLOSE usa (ligação de voz, menu ⋮,
"Fechar conversa") e o botão enviar são achados pelo nome interno do ícone
(`ic-call`, `ic-cancel`…), que não muda com o idioma. Se o WhatsApp renomear
os ícones, os nomes ficam em `src/shared/selectors.js`.

Se o som do jogo parar de tocar, provavelmente o WhatsApp trocou o nome do
arquivo de som: os nomes ficam em `src/content/page-hook.js` (`SOUNDS`) e a
investigação em `docs/sound-investigation.md`. No popup, o modo **WhatsApp**
devolve os sons originais enquanto isso.

## Desenvolver

Precisa de Node.js e do Firefox.

```
npm install
npm run dev        # abre um Firefox separado com a extensão, que recarrega sozinha
npm test           # testes E2E (Playwright no Firefox)
npm run lint       # web-ext lint + seletores no lugar certo
npm run package    # zip da AMO em web-ext-artifacts/, com o conteúdo conferido
```

- Os testes usam páginas de WhatsApp de mentira em `tests/fixtures/` (código
  nosso, texto lorem) e deixam relatório em `playwright-report/` e
  `test-results/`.
- Especificação completa: `spec.md`. Instruções para agentes: `CLAUDE.md`.
- Publicação na AMO (ficha, notas para o revisor): `docs/amo-listing.md`.
- No Windows, se o Firefox do Playwright não abrir (`spawn UNKNOWN`), instale
  os navegadores fora de `AppData\Local` com a variável
  `PLAYWRIGHT_BROWSERS_PATH`.

## Licença

O código é MIT (`LICENSE`). Os três sons em `assets/sounds/` são de
Cyberpunk 2077, © CD PROJEKT RED, e não são cobertos pela licença
(`assets/sounds/NOTICE.md`). As fontes são SIL Open Font License
(`assets/fonts/OFL.txt`).
