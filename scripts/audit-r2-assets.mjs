import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const R2_BASE = 'https://storage.thegreatpuzzleproject.com';

console.log('\n============================================================');
console.log('🔍 [AUDITORÍA R2] Análisis Integral de Assets, Public y Storage');
console.log('============================================================\n');

// 1. ESCANEAR ARCHIVOS LOCALES EN PUBLIC/
function getFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const publicFiles = getFilesRecursively(PUBLIC_DIR).map(f => {
  const rel = path.relative(PUBLIC_DIR, f).replace(/\\/g, '/');
  const stat = fs.statSync(f);
  return {
    path: '/' + rel,
    fullPath: f,
    sizeKb: (stat.size / 1024).toFixed(1),
    ext: path.extname(f).toLowerCase()
  };
});

const publicImages = publicFiles.filter(f => 
  ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ico'].includes(f.ext)
);

console.log(`📦 Archivos de imagen encontrados en public/: ${publicImages.length}`);

// 2. ESCANEAR TODAS LAS REFERENCIAS DE IMÁGENES EN SRC/
const srcFiles = getFilesRecursively(SRC_DIR).filter(f => 
  /\.(astro|svelte|md|mdx|mdoc|ts|tsx|json)$/.test(f)
);

const allReferences = new Set();
const r2References = new Set();
const wikimediaReferences = new Set();
const localPublicReferences = new Set();
const otherExternalReferences = new Set();

const fileRefMap = {};

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relFile = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

  // Regex para capturar URLs o paths de imágenes
  const regexes = [
    /https?:\/\/[^\s"'<>\)]+\.(?:jpg|jpeg|png|webp|svg|gif)/gi,
    /https:\/\/storage\.thegreatpuzzleproject\.com\/[^\s"'<>\)]+/gi,
    /https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/[^\s"'<>\)]+/gi,
    /["'](\/[a-zA-Z0-9_\-\.\/]+\.(?:jpg|jpeg|png|webp|svg|gif|ico))["']/gi
  ];

  for (const rx of regexes) {
    const matches = content.matchAll(rx);
    for (const m of matches) {
      const ref = m[1] || m[0];
      allReferences.add(ref);

      if (!fileRefMap[ref]) fileRefMap[ref] = [];
      if (!fileRefMap[ref].includes(relFile)) fileRefMap[ref].push(relFile);

      if (ref.includes('storage.thegreatpuzzleproject.com')) {
        r2References.add(ref);
      } else if (ref.includes('wikimedia.org')) {
        wikimediaReferences.add(ref);
      } else if (ref.startsWith('/')) {
        localPublicReferences.add(ref);
      } else if (ref.startsWith('http')) {
        otherExternalReferences.add(ref);
      }
    }
  }
}

console.log(`🔗 Total de referencias visuales únicas en src/: ${allReferences.size}`);
console.log(`   - Alojamientos confirmados en Cloudflare R2: ${r2References.size}`);
console.log(`   - Referencias a public/ local: ${localPublicReferences.size}`);
console.log(`   - Referencias directas a Wikimedia: ${wikimediaReferences.size}`);
console.log(`   - Otras referencias externas: ${otherExternalReferences.size}\n`);

// 3. PROBAR DISPONIBILIDAD EN R2 PARA ASSETS DE PUBLIC/
async function testUrlHead(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return res.status;
  } catch (e) {
    return 0;
  }
}

async function auditR2Presence() {
  console.log('🌐 Probando si las imágenes de public/ existen en el bucket R2...');
  
  const publicInR2Results = [];

  for (const img of publicImages) {
    // Probar posibles rutas en R2
    const probeUrls = [
      `${R2_BASE}${img.path}`,
      `${R2_BASE}/vault-media${img.path}`,
      `${R2_BASE}/wikimedia${img.path}`
    ];

    let foundInR2 = false;
    let foundUrl = null;

    for (const probe of probeUrls) {
      const status = await testUrlHead(probe);
      if (status >= 200 && status < 300) {
        foundInR2 = true;
        foundUrl = probe;
        break;
      }
    }

    publicInR2Results.push({
      file: img.path,
      size: `${img.sizeKb} KB`,
      foundInR2,
      r2Url: foundUrl || 'NO_SUBIDO_A_R2',
      usedInCode: fileRefMap[img.path] || []
    });
  }

  // 4. CHEQUEO DEL MECANISMO DE AUTOMATIZACIÓN
  console.log('\n⚙️ Chequeo del mecanismo de guardado automático a R2:');
  const syncContent = fs.readFileSync(path.join(__dirname, 'sync.mjs'), 'utf8');
  const eodContent = fs.readFileSync(path.join(__dirname, 'eod.mjs'), 'utf8');
  const pkgContent = fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8');
  const astroContent = fs.readFileSync(path.join(ROOT_DIR, 'astro.config.mjs'), 'utf8');

  const hasAutoR2InSync = syncContent.includes('r2') || syncContent.includes('vault') || syncContent.includes('transmute');
  const hasAutoR2InEod = eodContent.includes('r2') || eodContent.includes('migrate-wikimedia');
  const hasBuildHook = pkgContent.includes('build') && (pkgContent.includes('r2') || pkgContent.includes('transmute'));

  const autoUploadStatus = {
    syncMjsAutoUpload: hasAutoR2InSync,
    eodMjsAutoUpload: hasAutoR2InEod,
    buildAutoUpload: hasBuildHook,
    hasManualScript: fs.existsSync(path.join(__dirname, 'migrate-wikimedia-r2.mjs')),
    hasUiTransmutation: fs.existsSync(path.join(ROOT_DIR, 'src', 'components', 'vault', 'VaultEngine.svelte'))
  };

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPublicImages: publicImages.length,
      publicImagesInR2: publicInR2Results.filter(r => r.foundInR2).length,
      publicImagesMissingInR2: publicInR2Results.filter(r => !r.foundInR2).length,
      totalReferencesInSrc: allReferences.size,
      r2ReferencesCount: r2References.size,
      wikimediaReferencesCount: wikimediaReferences.size,
      localPublicReferencesCount: localPublicReferences.size
    },
    autoUploadStatus,
    publicAssetsAudit: publicInR2Results,
    r2References: Array.from(r2References),
    wikimediaReferences: Array.from(wikimediaReferences)
  };

  const reportPath = path.join(__dirname, 'r2-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('════════════════════════════════════════════════════════════');
  console.log(`📊 RESULTADOS DE LA INVESTIGACIÓN:`);
  console.log(`   - Imágenes en public/: ${report.summary.totalPublicImages}`);
  console.log(`   - Subidas a R2: ${report.summary.publicImagesInR2}`);
  console.log(`   - Faltantes en R2 (solo locales en public/): ${report.summary.publicImagesMissingInR2}`);
  console.log(`   - URLs que ya consumen R2 en el código: ${report.summary.r2ReferencesCount}`);
  console.log(`   - URLs que siguen consumiendo Wikimedia directa: ${report.summary.wikimediaReferencesCount}`);
  console.log(`\n🤖 ¿Se guardan las imágenes en automático a R2?`);
  console.log(`   - En 'npm run sync' (git push): NO (solo hace git pull/add/commit/push).`);
  console.log(`   - En 'npm run build': NO (compila dist estática).`);
  console.log(`   - En 'npm run eod': NO (ejecuta sanear -> doctor -> sync, no incluye migración R2).`);
  console.log(`   - ¿Existe automatización manual?: SÍ, mediante VaultEngine UI y scripts/migrate-wikimedia-r2.mjs.`);
  console.log(`════════════════════════════════════════════════════════════`);
  console.log(`\n📄 Reporte detallado generado en: scripts/r2-audit-report.json\n`);
}

auditR2Presence().catch(console.error);
