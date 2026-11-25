// Moldura dos balões (C6/C7): cada lado é UMA linha nítida, com a mesma força
// nos quatro lados, mesmo com o balão em posição/altura fracionária (citação,
// lista, reação) e em telas com escala do Windows (125 %, 150 %).
//
// Como mede: tira um print da tela e, para cada lado de cada balão, olha o
// perfil de brilho atravessando a linha. Linha nítida = um pixel forte e
// vizinhos bem mais fracos. Linha "apagada" = dois pixels a meia força.
import { test, expect } from '@playwright/test';

const SIDES = {
  // t: onde ao longo do lado medir (fora da reação, do horário e da citação)
  L: [0.45, 0.6, 0.75],
  R: [0.35, 0.5, 0.65],
  T: [0.45, 0.6, 0.75],
  B: [0.4, 0.55, 0.7]
};

/** Perfis de brilho de todos os lados de todos os balões, no print da tela. */
async function measure(page) {
  const dpr = await page.evaluate(() => devicePixelRatio);
  const boxes = await page.evaluate(() => [...document.querySelectorAll('[data-holo-bubble]')].map((el, i) => {
    const r = el.getBoundingClientRect();
    return { i, dir: el.getAttribute('data-holo-bubble'), x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }));
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ png, boxes, dpr, SIDES }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + png;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const lum = (x, y) => { const k = (img.width * y + x) * 4; return Math.max(d[k], d[k + 1], d[k + 2]); };
    const median = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
    return boxes.map((bx) => {
      const sides = {};
      for (const [s, ts] of Object.entries(SIDES)) {
        const peaks = [], ratios = [];
        for (const t of ts) {
          // pixel da borda (lado de fora) e o perfil de 3 px para fora a 2 px para dentro
          let prof = [];
          if (s === 'L' || s === 'R') {
            const y = Math.floor((bx.y + bx.h * t) * dpr);
            const e = s === 'L' ? Math.floor(bx.x * dpr) : Math.ceil(bx.r * dpr) - 1;
            for (let k = -3; k <= 3; k++) prof.push(lum(s === 'L' ? e + k : e - k, y));
          } else {
            const x = Math.floor((bx.x + bx.w * t) * dpr);
            const e = s === 'T' ? Math.floor(bx.y * dpr) : Math.ceil(bx.b * dpr) - 1;
            for (let k = -3; k <= 3; k++) prof.push(lum(x, s === 'T' ? e + k : e - k));
          }
          const top = Math.max(...prof);
          const at = prof.indexOf(top);
          const second = Math.max(prof[at - 1] ?? 0, prof[at + 1] ?? 0);
          peaks.push(top);
          ratios.push(second / top);
        }
        sides[s] = { peak: median(peaks), spill: +median(ratios).toFixed(2) };
      }
      return { bubble: `${bx.i} (${bx.dir}) y=${bx.y.toFixed(2)} h=${bx.h.toFixed(2)}`, sides };
    });
  }, { png, boxes, dpr, SIDES });
}

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
      const problems = [];
      for (const { bubble, sides } of found) {
        const strongest = Math.max(...Object.values(sides).map((v) => v.peak));
        for (const [s, { peak, spill }] of Object.entries(sides)) {
          // espalhada em 2 px (meia força cada) ou mais fraca que os outros lados
          if (spill > 0.6 || peak < strongest * 0.85) problems.push(`${bubble} lado ${s}: força ${peak}/${strongest}, vazamento ${spill}`);
        }
      }
      expect(problems, JSON.stringify(found, null, 1)).toEqual([]);
    });
  });
}
