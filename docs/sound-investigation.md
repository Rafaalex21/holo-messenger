# Investigação do som de notificação (F1.3)

Inspeção de 25/11/2026 com `npm run recon`, Firefox 161 e WhatsApp Web em pt-BR. Os ganchos foram injetados em `document_start` no mundo MAIN, por `scripts/recon/ext/wa-recon.js`. Em cerca de 5 minutos, chegaram mensagens em outras conversas.

## Resultado

| Pergunta | Resposta |
|---|---|
| API usada | **`HTMLAudioElement`** (`new Audio(url)` + `.play()`). **Nenhum** uso de Web Audio (`AudioBufferSourceNode.start`, `decodeAudioData`) nem de `fetch` de áudio. |
| Arquivo | `https://static.whatsapp.net/rsrc.php/yW/r/BS_BUUXbKq5.mp3` |
| Quando o elemento é criado | Uma vez, preguiçosamente, na primeira notificação (cerca de 18 s após abrir), e reaproveitado depois. |
| No DOM? | Não (`isConnected: false`). |
| Volume / mudo | `volume: 1`, `muted: false`. |
| Quem chama | Uma função que, mesmo minificada, mantém o nome `playSound` na pilha (`u ← a.playSound ← e`), num módulo `Ll53I743KGk.js`. |
| Plays observados | 7, um por notificação. |
| `Notification` do sistema | Não foi chamada: a permissão estava `default` (o perfil de recon nunca autorizou). **Refazer com a permissão concedida** para ver se o som do Windows se soma ao do app. |
| Título `(N) WhatsApp` | **Não verificado.** O observador do título não chegou a ser ligado nessa versão do script (o `<title>` ainda não existe em `document_start`). Já está corrigido para a próxima inspeção. |
| Outros eventos | Um `new Audio()` sem `src` aos 6 s, sem `play` depois (provável teste de suporte), e um `<video>` com `src` blob, que era uma mensagem de vídeo. Nada disso é notificação. |

## Consequências para a F6

1. **O plano A (interceptar) funciona** e é o principal. O `page-hook.js` no mundo MAIN envolve `HTMLMediaElement.prototype.play`. Um `play()` é considerado som de notificação do WhatsApp quando:
   - o elemento é `HTMLAudioElement` e **não está no DOM**; e
   - o `src` é `static.whatsapp.net/rsrc.php/…/*.mp3`; e
   - o nome do arquivo está em `SOUND_URL_PATTERNS` (hoje `BS_BUUXbKq5.mp3`) **ou**, como fallback para quando o hash mudar num deploy, a pilha contém `playSound`.

   Nesse caso o hook devolve `Promise.resolve()` sem tocar e dispara `holo:notify`. Mensagens de voz e vídeos usam `blob:` e ficam de fora.
2. **Não interceptar outros MP3 estáticos às cegas.** O toque de chamada e outros sons do app podem usar outros arquivos; só o padrão acima é trocado.
3. **O plano A' (Web Audio) não é necessário hoje.** Fica no código só como detector, para o diagnóstico avisar se o WhatsApp mudar de API.
4. **O plano B (título) continua como fallback,** mas depende de confirmar o formato do título na próxima inspeção.
5. **O plano C (`Notification` silenciosa)** depende do teste com a permissão concedida.
6. **O diagnóstico do popup (F8.2) deve avisar** quando chega mensagem, o título sobe e nenhum `play()` compatível foi visto. Isso indica que o hash ou a API mudaram.
