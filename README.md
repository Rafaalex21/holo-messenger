# Holo-Messenger

Extensão para o Firefox que deixa o WhatsApp Web com cara do app de mensagens
do celular de **Cyberpunk 2077**: balões com canto chanfrado e moldura neon,
fontes do estilo do jogo, scanlines, glitch nas mensagens novas e os sons do
jogo para mensagem e ligação.

Projeto de fã, sem fins comerciais. Não é afiliado à CD PROJEKT RED nem ao
WhatsApp/Meta.

## Instalar

- **Pela loja do Firefox (AMO):** a página da extensão entra aqui quando a
  revisão da Mozilla aprovar.
- **A partir do código** (para testar mudanças): veja [Desenvolver](#desenvolver).

Precisa do Firefox 140 ou mais novo, no computador. Funciona só em
`web.whatsapp.com`.

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
