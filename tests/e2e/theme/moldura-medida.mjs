// Medida da moldura dos balões no print da tela (C6/C7), usada pelos testes
// de tema: cada lado tem que ser UMA linha nítida, com a mesma força nos
// quatro lados.
//
// Como mede: tira um print e, para cada lado de cada balão inteiro na tela,
// olha o perfil de brilho atravessando a linha. Linha nítida = um pixel forte
// e vizinhos bem mais fracos. Linha "apagada" = dois pixels a meia força.
const SIDES = {
  // t: onde ao longo do lado medir (fora da reação, do horário e da citação)
  L: [0.45, 0.6, 0.75],
  R: [0.35, 0.5, 0.65],
  T: [0.45, 0.6, 0.75],
  B: [0.4, 0.55, 0.7]
};

/** Perfis de brilho de todos os lados de todos os balões, no print da tela. */
export async function measure(page) {
  const dpr = await page.evaluate(() => devicePixelRatio);
  // só os balões inteiros na tela (com 4 px de folga para o perfil da linha)
  const boxes = await page.evaluate(() => [...document.querySelectorAll('[data-holo-bubble]')].map((el, i) => {
    const r = el.getBoundingClientRect();
    return { i, dir: el.getAttribute('data-holo-bubble'), x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }).filter((b) => b.w && b.y >= 4 && b.b <= innerHeight - 4 && b.x >= 4 && b.r <= innerWidth - 4));
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

/** Lados apagados (espalhados em 2 px) ou mais fracos que os outros lados. */
export function frameProblems(found) {
  const problems = [];
  for (const { bubble, sides } of found) {
    const strongest = Math.max(...Object.values(sides).map((v) => v.peak));
    for (const [s, { peak, spill }] of Object.entries(sides)) {
      if (spill > 0.6 || peak < strongest * 0.85) problems.push(`${bubble} lado ${s}: força ${peak}/${strongest}, vazamento ${spill}`);
    }
  }
  return problems;
}
