import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'src', 'content');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const REPORT_FILE = path.join(__dirname, 'doctor-report.json');

console.log('\n============================================================');
console.log('🩺 [DOCTOR TGP] Diagnóstico Integral de Salud del Repositorio');
console.log('============================================================\n');

let issues = [];

// 1. CHEQUEO DE SEGURIDAD: Archivos de Desk protegidos
try {
  const trackedForbidden = execSync('git ls-files .env .history scratch *.bak extra-kelvin *.ps1 scripts/test-*', { 
    cwd: ROOT_DIR,
    stdio: ['pipe', 'pipe', 'ignore'] 
  }).toString().trim();

  if (trackedForbidden) {
    const files = trackedForbidden.split('\n').map(f => f.trim()).filter(Boolean);
    issues.push({
      tipo: 'SEGURIDAD_DESK_FILTRADO',
      mensaje: 'Archivos locales de Desk detectados en el seguimiento de Git',
      archivos: files,
      solucion: 'Ejecutar git rm --cached -r <archivo> y verificar .gitignore'
    });
    console.log('❌ [SEGURIDAD] Archivos de Desk rastreados en Git (deben ser locales):');
    files.forEach(f => console.log(`   - ${f}`));
    console.log('');
  } else {
    console.log('🔒 [SEGURIDAD] .env, .history, scratch y backups están 100% protegidos y locales.');
  }
} catch (e) {
  // git no disponible o no repo
}

// 2. CHEQUEO DE CONTENIDOS: Imágenes Fantasma & Referencias Rotas
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(json|md|mdoc|mdx)$/.test(item.name)) {
      let text = fs.readFileSync(fullPath, 'utf8');
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      // Buscar enlaces a imágenes locales en public o src
      const matches = text.matchAll(/(?:coverImage|heroUrl|imageUrl|src|image):\s*["']?(\/[^"'\s\n>]+)/g);
      for (const m of matches) {
        const url = m[1];
        if (url.startsWith('http://') || url.startsWith('https://')) continue;

        const publicPath = path.join(PUBLIC_DIR, url.replace(/^\//, ''));
        const srcPath = path.join(ROOT_DIR, url.replace(/^\//, ''));

        if (!fs.existsSync(publicPath) && !fs.existsSync(srcPath)) {
          issues.push({
            tipo: 'IMAGEN_FANTASMA',
            archivo: path.relative(ROOT_DIR, fullPath),
            referenciaRota: url,
            solucion: 'Colocar la imagen en public/ o corregir la ruta en el frontmatter'
          });
          console.log(`⚠️ [IMAGEN FANTASMA] Archivo: ${path.relative(ROOT_DIR, fullPath)}`);
          console.log(`   Referencia rota: ${url}\n`);
        }
      }

      // Chequeo de Frontmatter mínimo (title)
      if (/\.(md|mdx)$/.test(item.name)) {
        if (!/^---\s*[\r\n]+[\s\S]*?title:\s*["']?.+?["']?[\r\n]+/m.test(text)) {
          issues.push({
            tipo: 'FRONTMATTER_INVALIDO',
            archivo: path.relative(ROOT_DIR, fullPath),
            mensaje: 'Falta campo obligatorio "title" en frontmatter',
            solucion: 'Agregar title al inicio del archivo MD/MDX'
          });
          console.log(`⚠️ [FRONTMATTER] Falta campo "title" en: ${path.relative(ROOT_DIR, fullPath)}\n`);
        }
      }
    }
  }
}

scanDir(CONTENT_DIR);

// 3. RESULTADO Y EMISIÓN DE REPORTE AUTO-SANEABLE
if (issues.length === 0) {
  if (fs.existsSync(REPORT_FILE)) fs.unlinkSync(REPORT_FILE);
  console.log('✅ [DOCTOR] Repositorio 100% saludable: Listo para compilar y sincronizar.\n');
  process.exit(0);
} else {
  // Guardar reporte en JSON para que el agente AI lo pueda inspeccionar y sanear
  fs.writeFileSync(REPORT_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    issues
  }, null, 2), 'utf8');

  console.log(`🚨 [DOCTOR] Se detectaron ${issues.length} inconsistencias.`);
  console.log(`📋 Reporte generado en: scripts/doctor-report.json`);
  console.log('Frenando proceso EOD para evitar commits con errores.\n');
  process.exit(1);
}
