// F8.1: seletores do WhatsApp só em dois lugares, para uma atualização do
// WhatsApp se consertar num lugar só (spec §5):
//  - JS: src/shared/selectors.js. Nenhum outro .js de src/ cita data-testid,
//    aria-label, role, data-icon ou os ids #main/#side/#pane-side/#app.
//  - CSS: cada parcial src/theme/_*.css lista no cabeçalho "=== SELECTORS ==="
//    todo seletor do WhatsApp que usa nas regras.
//
// Como isso pode quebrar sem ninguém ver (o que este script barra):
//  1. alguém escreve um data-testid direto no content.js ou no page-hook.js;
//  2. uma regra de CSS nova usa um seletor que não está no cabeçalho do arquivo
//     (quem for consertar depois de uma atualização do WhatsApp não acha);
//  3. um parcial de CSS com seletor do WhatsApp sem cabeçalho nenhum.
// Seletores da própria extensão (data-holo-*, .holo-*) não contam.
//
// Uso: node scripts/check-selectors.mjs (roda dentro do npm run lint)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const WA = /\[(?:data-testid|aria-label|role|data-icon)[\^*$]?=(?:"[^"]+"|'[^']+')(?: i)?\]|#(?:main|side|pane-side|app)\b/g;
const problems = [];
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const filesIn = (dir, ext) => readdirSync(join(root, dir), { recursive: true })
  .filter((f) => f.endsWith(ext)).map((f) => join(dir, f).replace(/\\/g, '/'));

for (const f of filesIn('src', '.js')) {
  if (f === 'src/shared/selectors.js') continue;
  const code = stripComments(readFileSync(join(root, f), 'utf8'));
  for (const m of new Set(code.match(WA) || [])) problems.push(`${f}: ${m} devia estar em src/shared/selectors.js`);
}

for (const f of filesIn('src/theme', '.css')) {
  const css = readFileSync(join(root, f), 'utf8');
  const head = css.match(/=== SELECTORS ===([\s\S]*?)\*\//);
  const rules = stripComments(head ? css.slice(head.index + head[0].length) : css);
  for (const m of new Set(rules.match(WA) || [])) {
    const key = m.includes('"') ? m.match(/"([^"]+)"/)[1] : m;
    if (!head) problems.push(`${f}: usa ${m} e não tem cabeçalho "=== SELECTORS ==="`);
    else if (!head[1].includes(key)) problems.push(`${f}: ${m} falta no cabeçalho SELECTORS`);
  }
}

if (problems.length) {
  console.error('✗ seletores do WhatsApp fora do lugar:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('✓ seletores do WhatsApp só em selectors.js e nos cabeçalhos SELECTORS do CSS');
