// C17/C18: moldura dos menus, janelas e do painel de emojis/figurinhas.
// Bug visto no WhatsApp real (2026-11-26): o painel de figurinhas abria sem
// as bordas dos lados.
//
// Como a moldura pode falhar:
//  1. um bloco com fundo opaco encostado na borda (painel de figurinhas,
//     cabeçalho de janela, item de menu em foco) pinta por cima da moldura
//     e some com o lado que ele toca;
//  2. a correção desenha a moldura duas vezes (dois pixels de ciano em vez
//     de uma linha de 1 px);
//  3. a correção vale para um tipo de sobreposição e esquece outro;
//  4. desligar o tema deixa a moldura para trás.
import { test, expect } from '@playwright/test';

const ACCENT = [92, 225, 230];
const OVERLAYS = {
  'painel de figurinhas': '#expressions-panel-container [role="application"]',
  'menu de contexto': '#menu',
  'janela': '[role="dialog"]'
};

// para cada lado de cada sobreposição, em 5 pontos: o pixel da borda é ciano
// e o vizinho de dentro não é
async function frames(page) {
  const boxes = await page.evaluate((sel) => Object.entries(sel).map(([name, s]) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { name, x: r.left, y: r.top, r: r.right, b: r.bottom };
  }), OVERLAYS);
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ png, boxes, ACCENT }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + png;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const dist = (x, y) => { const k = (img.width * y + x) * 4; return Math.hypot(d[k] - ACCENT[0], d[k + 1] - ACCENT[1], d[k + 2] - ACCENT[2]); };
    const out = [];
    for (const bx of boxes) {
      for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const y = Math.round(bx.y + (bx.b - bx.y) * t), x = Math.round(bx.x + (bx.r - bx.x) * t);
        const sides = {
          esquerdo: [[bx.x, y], [bx.x + 1, y]],
          direito: [[bx.r - 1, y], [bx.r - 2, y]],
          topo: [[x, bx.y], [x, bx.y + 1]],
          base: [[x, bx.b - 1], [x, bx.b - 2]]
        };
        for (const [side, [edge, inner]] of Object.entries(sides)) {
          out.push({ where: `${bx.name}, lado ${side} (${t})`, edge: Math.round(dist(...edge)), inner: Math.round(dist(...inner)) });
        }
      }
    }
    return out;
  }, { png, boxes, ACCENT });
}

test('menus, janelas e o painel de figurinhas têm a moldura nos quatro lados, com 1 px', async ({ page }) => {
  await page.goto('/tests/fixtures/wa-overlays.html?holo=1');
  await expect(page.locator('html')).toHaveAttribute('data-holo', '');
  const found = await frames(page);
  // 1 e 3: ciano no pixel da borda, em todos os lados de todas
  const missing = found.filter((f) => f.edge > 40).map((f) => `${f.where}: borda a ${f.edge} do ciano`);
  // 2: o pixel de dentro já não é a linha
  const doubled = found.filter((f) => f.inner <= 60).map((f) => `${f.where}: linha dupla (dentro a ${f.inner} do ciano)`);
  expect([...missing, ...doubled]).toEqual([]);
});

test('desligar o tema tira a moldura das sobreposições', async ({ context }) => {
  // 4: a mesma página sem a extensão é a referência
  const plain = await context.newPage();
  await plain.goto('/tests/fixtures/wa-overlays.html');
  const original = await plain.screenshot();
  await plain.close();

  const page = await context.newPage();
  await page.goto('/tests/fixtures/wa-overlays.html?holo=1');
  await expect(page.locator('html')).toHaveAttribute('data-holo', '');
  const popup = await context.newPage();
  await popup.goto('/src/popup/popup.html?stub=1');
  await popup.getByRole('checkbox', { name: 'TEMA' }).uncheck();
  await expect.poll(async () => (await page.screenshot()).equals(original)).toBe(true);
});
