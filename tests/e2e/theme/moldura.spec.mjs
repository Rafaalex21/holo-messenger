// Moldura dos balões (C6/C7): cada lado é UMA linha nítida, com a mesma força
// nos quatro lados, mesmo com o balão em posição/altura fracionária (citação,
// lista, reação) e em telas com escala do Windows (125 %, 150 %).
//
// Como mede: tira um print da tela e, para cada lado de cada balão, olha o
// perfil de brilho atravessando a linha. Linha nítida = um pixel forte e
// vizinhos bem mais fracos. Linha "apagada" = dois pixels a meia força.
import { test, expect } from '@playwright/test';
import { measure, frameProblems } from './moldura-medida.mjs';

// 125 % e 150 % (escala do Windows): mesmo com a caixa da moldura no pixel
// certo, o Firefox não alinha o clip-path à grade da tela e as linhas saem
// a ~60 % de força. Problema conhecido, ainda sem solução: fica como fixme
// para ninguém achar que está coberto.
const KNOWN_BAD = new Set([1.25, 1.5]);

for (const scale of [1, 1.25, 1.5]) {
  test.describe(`tela em ${scale * 100}%`, () => {
    test.use({ deviceScaleFactor: scale, viewport: { width: 900, height: 760 } });

    test('os quatro lados de cada balão são uma linha nítida e com a mesma força', async ({ page }) => {
      test.fixme(KNOWN_BAD.has(scale), 'Firefox não alinha o clip-path à grade em escala fracionária');
      await page.goto('/tests/fixtures/wa-chat.html?holo=1');
      await expect(page.locator('[data-holo-bubble]')).toHaveCount(6);
      // sem o glitch de mensagem nova no meio da medição
      await expect(page.locator('[data-holo-new]')).toHaveCount(0);

      const found = await measure(page);
      expect(found).toHaveLength(6);
      expect(frameProblems(found), JSON.stringify(found, null, 1)).toEqual([]);
    });
  });
}
