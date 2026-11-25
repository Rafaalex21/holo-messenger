// Varredura de privacidade dos arquivos da inspeção antes de qualquer commit.
//   node scripts/recon/privacy-scan.mjs <arquivo> [...]
// Mostra só contagens e trechos mascarados (dígitos e letras viram * e x).
import { readFile } from 'node:fs/promises';

const PATTERNS = {
  'telefone (8+ dígitos seguidos)': /(?<![\w.-])\+?\d[\d\s-]{7,}\d(?![\w.-])/g,
  'jid do WhatsApp (@c.us/@g.us/@lid/@s.whatsapp.net)': /\d{5,}[^\s"'<>]*@(c\.us|g\.us|lid|s\.whatsapp\.net|newsletter|broadcast)/gi,
  'e-mail': /[\w.+-]+@[\w-]+\.[\w.]+/g,
  'URL de mídia/foto do WhatsApp': /https?:\/\/(pps|mmg|media[\w-]*)\.whatsapp\.net[^\s"'<>)]*/gi,
  'qualquer URL http(s)': /https?:\/\/[^\s"'<>)]+/gi,
  'data-pre-plain-text (nome + hora)': /data-pre-plain-text=/gi,
  'imagem base64 (fora o pixel cinza)': /data:image\/(?!gif;base64,R0lGODlhAQABAIAAAImJiQAAACwAAAAAAQABAAACAkQBADs=)[^"')\s]{20,}/gi,
  'blob: URL': /blob:https?:[^\s"'<>)]+/gi,
  'atributo alt com texto': /\balt="[^"]+"/gi,
  'atributo title com texto': /\btitle="[^"]+"/gi
};
const mask = (s) => s.slice(0, 60).replace(/\d/g, '*').replace(/[a-zà-ÿ]/gi, (c, i) => (i < 4 ? c : 'x'));

for (const file of process.argv.slice(2)) {
  const text = await readFile(file, 'utf8');
  console.log(`\n=== ${file} (${Math.round(text.length / 1024)} KB)`);
  for (const [name, re] of Object.entries(PATTERNS)) {
    const hits = text.match(re) || [];
    const uniq = [...new Set(hits)];
    console.log(`${hits.length ? '!!' : 'ok'} ${name}: ${hits.length}${uniq.length ? ` (únicos ${uniq.length}) ex.: ${uniq.slice(0, 4).map(mask).join(' | ')}` : ''}`);
  }
}
