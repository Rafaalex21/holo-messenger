// F8.3: conversa longa sem travar. O trabalho do tema por quadro (callbacks
// de requestAnimationFrame, MutationObserver e ResizeObserver; a página de
// mentira não usa nenhum deles, então tudo que aparece é da extensão) fica
// abaixo de 4 ms, mesmo com centenas de mensagens.
//
// Como pode travar (e o que este teste mede):
//  1. carregar mensagens antigas refaz o trabalho na conversa inteira, e o
//     custo cresce com o tamanho dela;
//  2. o observer faz trabalho pesado a cada mudança no DOM;
//  3. cada parada da rolagem recalcula a moldura de todos os balões;
//  4. uma mensagem nova varre tudo de novo;
//  5. (efeito colateral da otimização) o balão que estava longe da tela
//     quando as antigas entraram aparece com a borda apagada ao rolar até ele.
// A primeira varredura, ao abrir a conversa, é paga uma vez só: fica de fora
// do limite, mas aparece no relatório.
//
// Tolerância: um quadro pode passar de 4 ms (até 8 ms). Com a suíte rodando em
// paralelo, uma pausa do coletor de lixo cai às vezes num quadro nosso. Dois
// ou mais quadros acima de 4 ms é trabalho nosso (o código antigo tinha 4).
import { test, expect } from '@playwright/test';
import { measure, frameProblems } from './moldura-medida.mjs';

const BUDGET_MS = 4;
const OUTLIER_MS = 8;

// conta o tempo de cada callback de rAF / observers, por quadro
const perfProbe = () => {
  const log = [];
  let frameId = 0;
  const timed = (kind, fn) => function (...args) {
    const t = performance.now();
    try { return fn.apply(this, args); } finally { log.push({ kind, frame: frameId, ms: performance.now() - t }); }
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => raf(timed('raf:' + (fn.name || '?'), fn));
  const tick = () => { frameId++; raf(tick); };
  raf(tick);
  for (const name of ['MutationObserver', 'ResizeObserver']) {
    const Native = window[name];
    window[name] = class extends Native { constructor(fn) { super(timed(name, fn)); } };
  }
  window.__perf = {
    reset() { log.length = 0; },
    frames() {
      const by = new Map();
      for (const e of log) by.set(e.frame, (by.get(e.frame) || 0) + e.ms);
      return [...by.values()];
    },
    // os quadros mais pesados, com o tempo de cada tipo de callback
    heaviest(n) {
      const by = new Map();
      for (const e of log) {
        const f = by.get(e.frame) || { total: 0 };
        f.total += e.ms;
        f[e.kind] = (f[e.kind] || 0) + e.ms;
        by.set(e.frame, f);
      }
      return [...by.values()].sort((a, b) => b.total - a.total).slice(0, n);
    }
  };
};

const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
const worst = (frames) => Math.max(0, ...frames);

test('conversa com 600 mensagens: rolar, carregar antigas e receber mensagem ficam abaixo de 4 ms por quadro, com a moldura nítida', async ({ page }, info) => {
  await page.addInitScript(perfProbe);
  await page.goto('/tests/fixtures/wa-long.html?holo=1&n=600');
  await expect(page.locator('[data-holo-bubble]')).toHaveCount(600);
  await settle(page);
  const openMs = worst(await page.evaluate(() => window.__perf.frames()));

  const panel = page.locator('[data-testid="conversation-panel-messages"]');
  await page.evaluate(() => window.__perf.reset());

  const scrollTop = () => panel.evaluate((el) => el.scrollTop);
  // rola o painel na quantidade exata (a roda do mouse no Firefox rola bem
  // menos que o pedido); dispara os mesmos eventos de rolagem
  const scrollBy = (dy) => panel.evaluate((el, d) => el.scrollBy(0, d), dy);
  const start = await scrollTop();
  // rolar para cima aos poucos, carregando antigas 3 vezes (600 → 720)
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 6; i++) { await scrollBy(-900); await settle(page); }
    await page.getByRole('button', { name: 'Carregar mais antigas' }).click();
    await settle(page);
  }
  // a rolagem subiu mesmo: 18 × 900 px, menos o que as antigas somaram ao
  // scrollTop (3 × ~2200 px); não voltou para o fim a cada carga
  expect(start - await scrollTop()).toBeGreaterThan(8000);
  // descer 2700 px: um trecho que nunca esteve a menos de uma tela de
  // distância em nenhum ajuste até aqui (cada carregamento fica 5400 px
  // acima do anterior), então os balões dele só são ajustados se a rolagem
  // ajustar
  for (let i = 0; i < 3; i++) { await scrollBy(900); await settle(page); }
  // 5: mede antes de qualquer outra coisa disparar um ajuste por conta própria
  await settle(page);
  const found = await measure(page);
  expect(found.length).toBeGreaterThan(5);
  expect(frameProblems(found), JSON.stringify(found, null, 1)).toEqual([]);

  // voltar para baixo e receber uma mensagem
  for (let i = 0; i < 6; i++) { await scrollBy(1600); await settle(page); }
  await page.getByRole('button', { name: 'Chega mensagem' }).click();
  await expect(page.locator('[data-holo-bubble]')).toHaveCount(721);
  await settle(page);

  const frames = await page.evaluate(() => window.__perf.frames());
  const sorted = frames.slice().sort((a, b) => a - b);
  const report = {
    abrirConversaMs: +openMs.toFixed(2),
    quadrosComTrabalho: frames.length,
    medianaMs: +(sorted[sorted.length >> 1] || 0).toFixed(2),
    piorMs: +worst(frames).toFixed(2),
    acimaDe4Ms: frames.filter((ms) => ms >= BUDGET_MS).length,
    maisPesados: await page.evaluate(() => window.__perf.heaviest(5))
  };
  info.annotations.push({ type: 'desempenho', description: JSON.stringify(report) });
  console.log('desempenho', report);
  expect(report.acimaDe4Ms, JSON.stringify(report)).toBeLessThanOrEqual(1);
  expect(report.piorMs, JSON.stringify(report)).toBeLessThan(OUTLIER_MS);

});
