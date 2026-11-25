// Confere o contraste (WCAG 2.x) dos pares texto/fundo do tema — RNF-04, F5.3.
//
//   node scripts/check-contrast.mjs        → tabela; sai com código 1 se algum par < 4.5
//
// Lê os tokens de src/theme/_tokens.css (bloco base + paleta "teal"), então
// trocar uma cor lá e rodar de novo mostra na hora se quebrou a legibilidade.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/theme/_tokens.css'), 'utf8');

const block = (re) => {
  const m = css.match(re);
  const out = {};
  if (m) for (const d of m[1].matchAll(/--holo-([\w-]+):\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
};
const base = block(/:root\[data-holo\]\s*\{([\s\S]*?)\n\}/);
const palettes = { yellow: base, teal: { ...base, ...block(/\[data-holo-palette="teal"\]\s*\{([\s\S]*?)\n\}/) } };

// "#rrggbb" ou "rgb(r g b / a)" → [r, g, b, a]
const parse = (v) => {
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  m = v.match(/^rgb\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:\/\s*([\d.]+))?\)$/);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  throw new Error(`cor não reconhecida: ${v}`);
};
// cor translúcida sobre um fundo opaco
const over = (top, under) => top.slice(0, 3).map((c, i) => c * top[3] + under[i] * (1 - top[3])).concat(1);
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [descrição, texto, fundo, fundo-por-baixo (para fundos translúcidos)]
const PAIRS = [
  ['texto / fundo', 'text', 'bg'],
  ['texto / painel', 'text', 'bg-panel'],
  ['texto / menus', 'text', 'bg-elev'],
  ['metadado / fundo', 'text-dim', 'bg'],
  ['metadado / painel', 'text-dim', 'bg-panel'],
  ['metadado / menus', 'text-dim', 'bg-elev'],
  ['ciano / fundo (nomes, links)', 'accent', 'bg'],
  ['ciano / conversa ativa', 'accent', 'active', 'bg'],
  ['texto / conversa ativa', 'text', 'active', 'bg'],
  ['metadado / conversa ativa', 'text-dim', 'active', 'bg'],
  ['não lidas: amarelo / conversa ativa', 'warn', 'active', 'bg'],
  ['recebida: texto / balão', 'in-text', 'in-bg'],
  ['recebida: hora / balão', 'text-dim', 'in-bg'],
  ['recebida: link / balão', 'accent', 'in-bg'],
  ['enviada: texto / balão', 'out-text', 'out-bg'],
  ['enviada: hora / balão', 'out-meta', 'out-bg'],
  ['enviada: link / balão', 'accent', 'out-bg'],
  ['amarelo / fundo (CALL, enviar)', 'warn', 'bg'],
  ['vermelho / fundo (CLOSE)', 'danger', 'bg'],
  ['não lidas: amarelo / fundo', 'warn', 'bg'],
  ['aviso do sistema / fundo', '#b9a43a', 'bg']
];

let failed = 0;
for (const [name, tk] of Object.entries(palettes)) {
  console.log(`\n== paleta ${name}`);
  const color = (k) => parse(k.startsWith('#') ? k : tk[k]);
  for (const [label, fg, bg, under] of PAIRS) {
    let back = color(bg);
    if (back[3] < 1) back = over(back, color(under || 'bg'));
    const r = ratio(color(fg), back);
    const ok = r >= 4.5;
    if (!ok) failed++;
    console.log(`${ok ? 'ok ' : 'RUIM'}  ${r.toFixed(2).padStart(5)}:1  ${label}`);
  }
}
console.log(failed ? `\n${failed} par(es) abaixo de 4.5:1` : '\nTodos os pares ≥ 4.5:1 (WCAG AA)');
process.exit(failed ? 1 : 0);
