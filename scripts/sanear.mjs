import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'src', 'content');

console.log('\n============================================================');
console.log('🧹 [SANEAR TGP] Sanitización Automática de Sintaxis y Contenido');
console.log('============================================================\n');

let cleanedCount = 0;

function sanitizeFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 0. Eliminar BOM (Byte Order Mark) invisible de Windows
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  // 1. Escapar tags de texto libre tipo <...> que rompen el parser JSX/MDX
  content = content.replace(/(?<![a-zA-Z0-9_\/])<([a-zA-Z0-9_\-\s]+)>(?![a-zA-Z0-9_\/])/g, (match, p1) => {
    const validTags = [
      'img', 'span', 'div', 'p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'section', 'button', 'ul', 'ol', 'li', 'em', 'strong',
      'ArticleKenBurnsModal'
    ];
    const tagName = p1.trim().split(' ')[0];
    return validTags.includes(tagName) ? match : `&lt;${p1}&gt;`;
  });

  // 2. Normalizar enlaces con doble protocolo o espacios
  content = content.replace(/href=["']https?:\/\/https?:\/\//g, 'href="https://');

  // 3. Limpiar saltos de línea huérfanos en frontmatter
  content = content.replace(/^---\r?\n\r?\n/m, '---\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✔ [SANEADO] ${path.relative(ROOT_DIR, filePath)}`);
    cleanedCount++;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      sanitizeFile(fullPath);
    }
  }
}

walk(CONTENT_DIR);

if (cleanedCount > 0) {
  console.log(`\n✨ [SANEAR] Se sanitizaron con éxito ${cleanedCount} archivos.`);
} else {
  console.log('✨ [SANEAR] Todo el contenido ya se encuentra limpio y normalizado.');
}
console.log('============================================================\n');
