// Confere o pacote que vai para a AMO (web-ext-artifacts/*.zip) antes do envio.
//
// Como o pacote pode sair errado, e o que este script barra:
//  1. entra coisa pessoal: perfis do Firefox com o login do WhatsApp
//     (.wa-ff-profile, .recon-profile), .env, .claude, .git;
//  2. entra código da Meta ou saída crua da inspeção (tests/fixtures/wa-snapshot.html,
//     docs/recon/raw) ou prints do jogo (docs/ref);
//  3. entra coisa de desenvolvimento (tests, scripts, docs, node_modules, relatórios);
//  4. falta arquivo que o manifest, o popup, o CSS ou o JS pedem (som, fonte, ícone);
//  5. o diagnóstico de som (tirado do produto em 25/11/2026) volta sem querer;
//  6. manifest sem o id do Gecko ou sem a declaração de dados que a AMO exige,
//     ou versão diferente da do package.json.
//
// Uso: npm run package  (gera o zip com web-ext build e roda isto)
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, posix } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const zip = join(root, 'web-ext-artifacts', `holo-messenger-${pkg.version}.zip`);
const problems = [];
const fail = (msg) => problems.push(msg);

// lista e extrai com bsdtar, que lê zip: no Windows o tar.exe do sistema (o
// tar do Git Bash é o GNU, que não lê zip); fora dele, o bsdtar.
const TAR = process.platform === 'win32' ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar';
const files = execFileSync(TAR, ['-tf', zip], { encoding: 'utf8' })
  .split(/\r?\n/).filter((f) => f && !f.endsWith('/'));
const out = mkdtempSync(join(tmpdir(), 'holo-pkg-'));
execFileSync(TAR, ['-xf', zip, '-C', out]);
const read = (f) => readFileSync(join(out, f), 'utf8');
const has = new Set(files);

// 1-3: só entra o que é da extensão
const ALLOWED = /^(manifest\.json|src\/(background|content|popup|shared|theme)\/[^/]+\.(js|css|html)|assets\/(fonts\/[^/]+\.(woff2|txt)|icons\/[^/]+\.svg|sounds\/(message|call-outgoing|call-incoming)\.mp3|sounds\/NOTICE\.md))$/;
for (const f of files) if (!ALLOWED.test(f)) fail(`não devia estar no pacote: ${f}`);

// 4: tudo o que é pedido existe
const need = (from, ref) => {
  if (/^(https?:|data:|#)/.test(ref)) return;
  const path = ref.startsWith('/') ? ref.slice(1) : posix.normalize(posix.join(posix.dirname(from), ref));
  if (!has.has(path)) fail(`${from} pede ${ref}, que não está no pacote`);
};
const manifest = JSON.parse(read('manifest.json'));
const fromManifest = [
  ...manifest.background.scripts,
  ...manifest.content_scripts.flatMap((c) => [...(c.js || []), ...(c.css || [])]),
  manifest.action.default_popup,
  manifest.action.default_icon,
  ...Object.values(manifest.icons)
];
for (const f of fromManifest) need('manifest.json', f);
for (const f of files) {
  if (f.endsWith('.html')) for (const [, ref] of read(f).matchAll(/(?:src|href)="([^"]+)"/g)) need(f, ref);
  if (f.endsWith('.css')) for (const [, ref] of read(f).matchAll(/url\("?([^")]+)"?\)/g)) need(f, ref);
  if (f.endsWith('.js')) for (const [, ref] of read(f).matchAll(/'(assets\/[^']+)'/g)) need('manifest.json', ref);
}
for (const res of manifest.web_accessible_resources.flatMap((w) => w.resources)) {
  const re = new RegExp('^' + res.replace(/\./g, '\\.').replace(/\*/g, '[^/]+') + '$');
  if (!files.some((f) => re.test(f))) fail(`web_accessible_resources "${res}" não casa com nenhum arquivo`);
}

// 5: diagnóstico fora do produto
for (const f of files.filter((x) => /\.(js|html)$/.test(x))) {
  if (/soundLog|sound-log|sound-seen|DIAGN[ÓO]STICO/.test(read(f))) fail(`${f} ainda tem o diagnóstico de som`);
}

// 6: manifest pronto para a AMO
const gecko = manifest.browser_specific_settings?.gecko || {};
if (!gecko.id) fail('manifest sem browser_specific_settings.gecko.id');
if (!gecko.data_collection_permissions?.required?.length) fail('manifest sem data_collection_permissions');
if (manifest.version !== pkg.version) fail(`versão do manifest (${manifest.version}) ≠ package.json (${pkg.version})`);

rmSync(out, { recursive: true, force: true });
if (problems.length) {
  console.error(`✗ ${zip}\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`✓ ${zip}: ${files.length} arquivos, todos da extensão, nada faltando`);
console.log(files.map((f) => '  ' + f).join('\n'));
