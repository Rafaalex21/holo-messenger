// Servidor estático mínimo para ver o tema fora do WhatsApp (F3/F4/F9).
//
//   node scripts/serve-fixtures.mjs [porta]      (padrão 5177, só 127.0.0.1)
//
// Serve SÓ src/, assets/ e tests/fixtures/ — nunca a raiz do projeto, onde
// ficam .wa-ff-profile/ (login do WhatsApp) e docs/recon/raw/.
//
// /tests/fixtures/wa-snapshot.html?holo=1[&palette=teal][&buttons=playstation]
//   devolve a fixture com o CSS e os scripts da extensão (com um
//   browser.storage de mentira) e data-holo no <html>,
//   imitando o que o content script faz no WhatsApp de verdade.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 5177;
const allowed = ['src', 'assets', path.join('tests', 'fixtures')].map((d) => path.join(root, d) + path.sep);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const themeCss = manifest.content_scripts[0].css;

const themeJs = manifest.content_scripts[0].js;

// browser.storage de mentira: o content script lê a config e liga o tema
const stub = (palette, buttons) => `<script>
window.browser = { storage: {
  local: { get: async () => ({ 'holo:config': { enabled: true, palette: '${palette}', buttonLayout: '${buttons}' } }), set: async () => {} },
  onChanged: { addListener() {} } } };
</script>`;

function inject(html, palette, buttons) {
  const links = themeCss.map((f) => `<link rel="stylesheet" href="/${f}">`).join('\n')
    + '\n' + stub(palette, buttons) + '\n' + themeJs.map((f) => `<script src="/${f}"></script>`).join('\n');
  const attrs = ` data-holo="" data-holo-palette="${palette}" data-holo-fx="scanlines glow glitch"`;
  return html.replace(/<html([^>]*)>/i, `<html$1${attrs}>`).replace(/<\/head>/i, `${links}\n</head>`);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!allowed.some((dir) => file.startsWith(dir)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
    return;
  }
  const ext = path.extname(file);
  let body = fs.readFileSync(file);
  if (ext === '.html' && url.searchParams.has('stub')) {
    // /src/popup/popup.html?stub=1 → storage em memória (get/set/onChanged) para ver o popup fora do Firefox
    body = body.toString('utf8').replace('<script', `<script>
const holoStore = {}, holoListeners = [];
window.browser = { storage: {
  local: {
    get: async (k) => (k in holoStore ? { [k]: holoStore[k] } : {}),
    set: async (o) => { const ch = {}; for (const k in o) { ch[k] = { oldValue: holoStore[k], newValue: o[k] }; holoStore[k] = o[k]; } holoListeners.forEach((fn) => fn(ch, 'local')); }
  },
  onChanged: { addListener: (fn) => holoListeners.push(fn) } } };
</script>
<script`);
  }
  if (ext === '.html' && url.searchParams.has('holo')) {
    const palette = url.searchParams.get('palette') === 'teal' ? 'teal' : 'yellow';
    const buttons = url.searchParams.get('buttons') === 'playstation' ? 'playstation' : 'xbox';
    body = inject(body.toString('utf8'), palette, buttons);
  }
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
}).listen(port, '127.0.0.1', () => console.log(`fixtures em http://127.0.0.1:${port}/tests/fixtures/`));
