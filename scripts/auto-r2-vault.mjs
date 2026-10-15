import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cargar variables de entorno locales desde .env si existe
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const CACHE_FILE = path.join(ROOT_DIR, 'scratch', 'r2-vault-cache.json');

if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const PIN = (process.env.VAULT_PIN || '').trim();
const VAULT_FILE_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';
const VAULT_IMAGE_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/image-ingest';

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  ⚡ AUTO-VAULT R2: MIGRACIÓN AUTOMÁTICA DE ASSETS A R2    ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

if (!PIN || PIN.length !== 4) {
  console.error('❌ [ERROR] VAULT_PIN no está configurado en .env o no es un PIN válido de 4 dígitos.');
  console.error('   Verifica que .env contenga: VAULT_PIN=XXXX');
  process.exit(1);
}

// Cargar caché local para no re-procesar imágenes ya subidas a R2
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    cache = {};
  }
}

function saveCache() {
  const scratchDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

// ─── 1. TRANSMUTAR IMÁGENES EXTERNAS DE WIKIMEDIA ──────────────────
async function transmuteWikimedia(url, topic = 'vault-asset') {
  if (cache[url]) return cache[url];

  try {
    const res = await fetch(VAULT_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PIN}`
      },
      body: JSON.stringify({
        url,
        topic,
        title: path.basename(url).split('.')[0] || 'Wikimedia Artifact'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`   ⚠️ Fallo transmutando ${url.substring(0, 50)}... (${res.status}): ${errText}`);
      return null;
    }

    const data = await res.json();
    const r2Url = data.url || data.r2url || data.publicUrl;
    if (r2Url) {
      cache[url] = r2Url;
      saveCache();
      return r2Url;
    }
  } catch (e) {
    console.warn(`   ⚠️ Error de red con ${url.substring(0, 50)}...:`, e.message);
  }
  return null;
}

// ─── 2. SUBIR ASSETS LOCALES DE PUBLIC A R2 ─────────────────────────
async function uploadLocalFile(relPath) {
  if (cache[relPath]) return cache[relPath];

  const fullPath = path.join(ROOT_DIR, 'public', relPath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) return null;

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const fileName = path.basename(fullPath);
    const blob = new Blob([fileBuffer]);
    
    const fd = new FormData();
    fd.append('file', blob, fileName);
    fd.append('quality', '85');

    const res = await fetch(VAULT_FILE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIN}`
      },
      body: fd
    });

    if (!res.ok) {
      console.warn(`   ⚠️ Fallo subiendo ${relPath} (${res.status})`);
      return null;
    }

    const data = await res.json();
    const r2Url = data.data?.media?.publicUrl || data.url || data.publicUrl;
    if (r2Url) {
      cache[relPath] = r2Url;
      saveCache();
      return r2Url;
    }
  } catch (e) {
    console.warn(`   ⚠️ Error subiendo archivo ${relPath}:`, e.message);
  }
  return null;
}

// ─── 3. ESCANEAR ARCHIVOS DE CÓDIGO Y CONTENIDOS ────────────────────
function getAllCodeFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllCodeFiles(full));
    } else if (/\.(astro|md|mdx|json|svelte|ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const codeFiles = [
    ...getAllCodeFiles(path.join(ROOT_DIR, 'src', 'content')),
    ...getAllCodeFiles(path.join(ROOT_DIR, 'src', 'components')),
    ...getAllCodeFiles(path.join(ROOT_DIR, 'src', 'pages'))
  ];

  console.log(`📁 Analizando ${codeFiles.length} archivos de contenido y componentes...`);

  const WIKIMEDIA_REGEX = /https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/[^\s"'<>\)]+/g;
  const LOCAL_IMG_REGEX = /["'](\/(?:[a-zA-Z0-9_\-\/]+\.(?:png|jpg|jpeg|webp|gif|svg)))["']/g;

  let totalWikimediaMigrated = 0;
  let totalLocalMigrated = 0;

  for (const filePath of codeFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // A. Migrar referencias de Wikimedia
    const wikiMatches = Array.from(new Set(content.match(WIKIMEDIA_REGEX) || []));
    for (const wikiUrl of wikiMatches) {
      console.log(`\n⏳ [Wikimedia] Transmutando: ${path.basename(filePath)} -> ${wikiUrl.substring(0, 50)}...`);
      const r2Url = await transmuteWikimedia(wikiUrl);
      if (r2Url) {
        content = content.replaceAll(wikiUrl, r2Url);
        modified = true;
        totalWikimediaMigrated++;
        console.log(`   ✅ Transmutado a R2: ${r2Url}`);
      }
    }

    // B. Migrar imágenes pesadas de public utilizadas en este archivo
    const localMatches = Array.from(new Set(Array.from(content.matchAll(LOCAL_IMG_REGEX), m => m[1])));
    for (const localRef of localMatches) {
      // Excluir favicon y manifest esenciales
      if (localRef === '/favicon.ico' || localRef === '/favicon.svg' || localRef === '/robots.txt') continue;
      
      const localFileOnDisk = path.join(ROOT_DIR, 'public', localRef.replace(/^\//, ''));
      if (!fs.existsSync(localFileOnDisk)) continue;

      console.log(`\n⏳ [Local Public] Subiendo a R2: ${path.basename(filePath)} -> ${localRef}`);
      const r2Url = await uploadLocalFile(localRef);
      if (r2Url) {
        content = content.replaceAll(`"${localRef}"`, `"${r2Url}"`);
        content = content.replaceAll(`'${localRef}'`, `'${r2Url}'`);
        modified = true;
        totalLocalMigrated++;
        console.log(`   ✅ Alojado en R2: ${r2Url}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`💾 Actualizado: ${path.relative(ROOT_DIR, filePath)}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`🎉 Migración finalizada con éxito.`);
  console.log(`   - Imágenes Wikimedia transmutadas a WebP/R2: ${totalWikimediaMigrated}`);
  console.log(`   - Assets locales subidos a R2: ${totalLocalMigrated}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Error crítico durante la subida a R2:', err);
  process.exit(1);
});
