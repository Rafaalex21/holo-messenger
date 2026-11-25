# Holo-Messenger — instruções para agentes

Extensão Firefox (MV3) que deixa o WhatsApp Web com cara de Cyberpunk 2077. Especificação em `spec.md`; investigação de sons em `docs/sound-investigation.md`. Documentação e commits em português.

## Testes
- Nunca escreva testes unitários depois de escrever o código.
- Prefira fortemente testes E2E como mecanismo principal. Use-os para verificar que funcionalidades complexas funcionam. Ao final dos E2E, produza um artefato verificável e reproduzível.
- Se precisar testar um sistema isoladamente, primeiro escreva todas as formas como ele pode falhar, depois escreva o código.
- Scripts soltos no console do navegador não contam como teste.

### Como rodar
- `npm test` roda o Playwright no Firefox (`playwright.config.mjs`). Ele mesmo sobe `scripts/serve-fixtures.mjs` na porta 5178.
- Specs ficam em `tests/e2e/`. Os de som usam `tests/fixtures/wa-calls.html`, um WhatsApp de mentira (código nosso) que repete o que a inspeção gravou: arquivos de toque, play/pause e os `data-testid` da tela de ligação.
- Os de tema usam `tests/fixtures/wa-chat.html`, uma conversa de mentira com balões em posição e altura fracionárias. `tests/e2e/theme/moldura.spec.mjs` mede no print se cada lado da moldura é uma linha nítida de 1 pixel.
- `tests/e2e/audio-probe.js` anota o que chegaria ao alto-falante. `FakeWhatsApp.hearing()` devolve o que soa agora; `played()` devolve tudo que já tocou.
- Artefatos:
  - relatório HTML em `playwright-report/` (`npx playwright show-report`);
  - JSON em `test-results/results.json`;
  - trace, screenshot e vídeo de cada falha em `test-results/`.
- `npm run package` gera o zip da AMO e confere o conteúdo (`scripts/check-package.mjs`). Ficha da loja e notas para o revisor em `docs/amo-listing.md`.
- Windows: se o Firefox do Playwright falhar com `spawn UNKNOWN` (no log do Windows: "mozglue não pôde ser localizado"), a máquina está bloqueando programas em `AppData\Local`. Instale os navegadores em outra pasta com a variável `PLAYWRIGHT_BROWSERS_PATH`.

## Repositório público: nunca versionar
- Capturas de tela do jogo ou do usuário: `docs/ref/`, prints com nomes e conversas.
- `tests/fixtures/wa-snapshot.html`: CSS e DOM da Meta.
- Saída crua da inspeção: `docs/recon/raw/`.
- Perfis do Firefox: `.wa-ff-profile/` e `.recon-profile/`.
- Exceção decidida pelo dono: os três sons do jogo em `assets/sounds/` vão no repo e na AMO (spec §8.4).

O código da extensão nunca lê texto de conversa, nomes ou números. Só lê cores, atributos, `data-testid` e os dígitos do contador de não lidas.
