import fs from 'node:fs';
import path from 'node:path';

const dir = './src/content/ensayos';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Reemplazar <img ...> sin /> por <img ... />
  content = content.replace(/<img\s+([^>]*?)(?<!\/)>/gi, '<img $1 />');
  
  // Reemplazar <br> o <hr> sin />
  content = content.replace(/<br\s*(?<!\/)>/gi, '<br />');
  content = content.replace(/<hr\s*(?<!\/)>/gi, '<hr />');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[Fixed MDX JSX tags]: ${file}`);
  }
}
console.log('Validación de archivos MDX completada.');
