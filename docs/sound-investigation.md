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

## Ligações (F6.0, inspeção de 25/11/2026)

`npm run recon` v2 (ganchos de `pause`/`ended`/`loop`/`load`, Web Audio, WebRTC e `getUserMedia`), com uma ligação feita (chamou ~40 s sem atender) e uma recebida (tocou ~30 s, recusada).

| | Ligação **recebida** | Ligação **feita** (chamando) |
|---|---|---|
| Como o toque sai | `new Audio(".../kAbvQpjkfMK.ogg")`, `loop = true`, `play()` — pela mesma função `playSound` da mensagem | **Não há arquivo.** O "tu… tu…" vem no áudio da própria chamada: um `new Audio()` com `srcObject` (stream WebRTC), fora do DOM, que toca do início ao fim da ligação |
| Duração do arquivo | 2,75 s (repete) | — |
| Fim | `pause()`, depois `src = ""` e `load()` (evento `emptied`) | `pause()` do elemento da chamada quando desliga |
| Outros sinais | título pisca `(N)` a cada 2 s enquanto toca | `getUserMedia({audio})`, 3 `RTCPeerConnection`; a conexão fica `connected` em ~4 s, **antes** de atenderem (é com o servidor) |

Arquivos que o WhatsApp **criou mas não tocou** nessa sessão: `lsK0FC6wi8C.m4a` (antes da ligação) e `l-ut9G1w4eu.ogg` (logo depois de ligar). Prováveis sons de "conectando/encerrada"; o diagnóstico do popup avisa se algum tocar.

### Consequências
1. **Recebida:** igual à mensagem. `page-hook.js` reconhece `kAbvQpjkfMK.ogg` (plano B: `playSound` + `loop`) e espelha play → pause/`emptied`. Feito.
2. **Feita:** não dá para trocar só interceptando arquivo, e o elemento da chamada carrega também a voz depois que atendem. O plano é silenciar esse elemento **enquanto chama** e tocar o `call-outgoing` em loop, devolvendo o som quando atenderem. Falta um sinal confiável de "atendeu": inspeção v3 (marcadores do DOM da tela de ligação e `mute`/`unmute` das trilhas remotas).
