import fs from 'node:fs';

const rootPath = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION/src/Root.tsx';
let content = fs.readFileSync(rootPath, 'utf8');

const compRegex = /<Composition\s+id="dark-academia-loop-16x9"[\s\S]*?\/>\s*/;
const match = content.match(compRegex);
if (match) {
  content = content.replace(compRegex, '');
  content = content.replace('<>', '<>\n' + match[0]);
  fs.writeFileSync(rootPath, content, 'utf8');
  console.log('✅ Corregida ubicación de la composición dentro de <> en Root.tsx.');
} else {
  console.log('No se encontró');
}
