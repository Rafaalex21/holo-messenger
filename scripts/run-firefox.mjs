// Abre o Firefox instalado com uma extensão carregada como temporária.
//
//   node scripts/run-firefox.mjs <pasta-da-extensão> [opções extras do web-ext]
//   npm run dev     → a extensão do projeto (raiz), com recarga automática
//   npm run recon   → a extensão de inspeção (scripts/recon/ext)
//
// - Perfil próprio em .wa-ff-profile/ (fora do git), compartilhado entre dev e
//   recon: o login do WhatsApp feito numa vale para a outra.
// - Caminho ABSOLUTO do perfil: com caminho relativo o web-ext passa "-P nome"
//   e o Firefox procura um perfil com esse nome, não a pasta.
// - MOZ_NO_REMOTE=1: abre uma instância separada mesmo com o seu Firefox aberto.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [sourceArg = '.', ...extra] = process.argv.slice(2);
const bin = path.join(root, 'node_modules', 'web-ext', 'bin', 'web-ext.js');
const args = [
  bin, 'run',
  '--source-dir', path.resolve(root, sourceArg),
  '--firefox-profile', path.join(root, '.wa-ff-profile'),
  '--profile-create-if-missing', '--keep-profile-changes',
  '--start-url', 'https://web.whatsapp.com',
  ...extra
];
const child = spawn(process.execPath, args, { stdio: 'inherit', cwd: root, env: { ...process.env, MOZ_NO_REMOTE: '1' } });
child.on('exit', (code) => process.exit(code ?? 1));
