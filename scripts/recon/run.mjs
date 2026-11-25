// Abre o Firefox instalado com a extensão de inspeção (scripts/recon/ext) — `npm run recon`.
//
// - Perfil próprio em .recon-ff-profile/ (fora do git) com CAMINHO ABSOLUTO:
//   com caminho relativo o web-ext passa "-P nome" e o Firefox procura um perfil
//   com esse nome, não a pasta.
// - MOZ_NO_REMOTE=1: abre uma instância separada mesmo com o seu Firefox aberto.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const bin = path.join(root, 'node_modules', 'web-ext', 'bin', 'web-ext.js');
const args = [
  bin, 'run',
  '--source-dir', path.join(root, 'scripts', 'recon', 'ext'),
  '--firefox-profile', path.join(root, '.recon-ff-profile'),
  '--profile-create-if-missing', '--keep-profile-changes',
  '--start-url', 'https://web.whatsapp.com',
  '--no-reload',
  ...process.argv.slice(2)
];
const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, MOZ_NO_REMOTE: '1' } });
child.on('exit', (code) => process.exit(code ?? 1));
