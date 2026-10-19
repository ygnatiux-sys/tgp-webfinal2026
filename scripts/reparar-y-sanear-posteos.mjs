// scripts/reparar-y-sanear-posteos.mjs
// Saneador y Reparador Quirúrgico de Posteos TGP:
// 1. Detección y depuración de borradores truncados / duplicados
// 2. Inyección de imágenes de alta fidelidad para posts sin portada
// 3. Desduplicación de imágenes compartidas
// 4. Clasificación de contenido real vs stubs / cascajones

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENSAYOS_DIR = path.join(ROOT_DIR, 'src', 'content', 'ensayos');

const isApplyMode = process.argv.includes('--apply');

console.log('\n================================================================');
console.log(`🛠️  [REPARADOR TGP] Saneamiento Activo de Posteos (${isApplyMode ? 'MODO APLICAR CAMBIOS' : 'MODO DRY-RUN SIMULACIÓN'})`);
console.log('================================================================\n');

// ─── 1. CATÁLOGO DE IMÁGENES AUTÉNTICAS PARA REPARAR VACÍOS Y DUPLICADOS ─────
const CURACIONES_VISUALES = {
  // Posts sin imagen
  'el-monte-kailash-6233': {
    cover: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Mount_Kailash_from_North.jpg',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/e/e0/Mount_Kailash_from_North.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/3/30/Kailash_North_Face.jpg'
    ],
    setDraftFalse: true
  },
  'la-muralla-china-2716': {
    cover: 'https://upload.wikimedia.org/wikipedia/commons/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/1/10/Great_Wall_of_China_Mutianyu.jpg'
    ],
    setDraftFalse: true
  },
  // Desduplicación de Piri Reis (antes compartía con Alejandría)
  'piri-reis': {
    cover: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Piri_reis_world_map_01.jpg',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/7/70/Piri_reis_world_map_01.jpg'
    ]
  }
};

// ─── 2. REGLAS DE DUPLICADOS Y BORRADORES TRUNCADOS A DEPURAR ────────────────
const BORRADORES_OBSOLETOS = [
  {
    file: 'asado-argentino-3956.mdx',
    motivo: 'Borrador truncado a mitad de frase. Reemplazado por asado-argentino-4796.mdx (completo y publicado).'
  },
  {
    file: 'homenaje-a-maria-reiche-y-las-lineas-de-nasca-0680.mdx',
    motivo: 'Borrador truncado a mitad de frase (2KB). Reemplazado por homenaje-a-maria-reiche-y-las-lineas-de-nasca-3074.mdx (9.8KB completo).'
  }
];

const STUBS_DESARROLLO = [
  'ejemplo.md',
  'sample-registro.mdx'
];

let repairsApplied = 0;
let duplicatesPruned = 0;
let stubsFound = 0;

// ─── 3. REVISIÓN DE CADA ARCHIVO EN SRC/CONTENT/ENSAYOS ──────────────────────
const files = fs.readdirSync(ENSAYOS_DIR).filter(f => /\.(md|mdx)$/i.test(f));

console.log(`🔍 Inspeccionando ${files.length} archivos en src/content/ensayos...\n`);

for (const fileName of files) {
  const filePath = path.join(ENSAYOS_DIR, fileName);
  const content = fs.readFileSync(filePath, 'utf8');

  // A. Detectar si es borrador obsoleto/truncado
  const obsoleto = BORRADORES_OBSOLETOS.find(b => b.file === fileName);
  if (obsoleto) {
    console.log(`🗑️  [BORRADOR TRUNCADO DETECTADO] ${fileName}`);
    console.log(`   ↳ Motivo: ${obsoleto.motivo}`);
    if (isApplyMode) {
      // Mover a scratch/backups locales para no perder nada
      const backupDir = path.join(ROOT_DIR, 'scratch', 'pruned-drafts');
      fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(filePath, path.join(backupDir, fileName));
      fs.unlinkSync(filePath);
      console.log(`   ✔ Archivo retirado de producción (respaldo seguro en scratch/pruned-drafts/)`);
      duplicatesPruned++;
    } else {
      console.log(`   ℹ️ [Dry-Run] Se retiraría de producción (usar --apply para ejecutar)`);
    }
    console.log('');
    continue;
  }

  // B. Detectar stubs de prueba
  if (STUBS_DESARROLLO.includes(fileName)) {
    console.log(`🧪 [STUB DE PRUEBA] ${fileName} (Archivo testigo de compilación local)`);
    stubsFound++;
    continue;
  }

  // C. Analizar calidad y extensión del contenido
  const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---([\s\S]*)$/);
  const bodyText = (bodyMatch ? bodyMatch[1] : content).trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const isTruncated = /que$|de$|la$|el$|y$|con$|una$/i.test(bodyText.slice(-30).trim());

  if (wordCount < 60 || isTruncated) {
    console.log(`⚠️  [ALERTA DE CONTENIDO CORTO O TRUNCADO] ${fileName}`);
    console.log(`   ↳ Palabras: ${wordCount} | ¿Termina abruptamente?: ${isTruncated ? 'SÍ' : 'NO'}`);
    console.log('');
  }

  // D. Reparar imágenes faltantes o desduplicar
  const slugMatch = content.match(/slug:\s*["']?([^"'\r\n]+)["']?/) || fileName.replace(/\.(md|mdx)$/, '');
  const slug = typeof slugMatch === 'string' ? slugMatch : (slugMatch[1] || fileName.replace(/\.(md|mdx)$/, ''));

  const curacion = CURACIONES_VISUALES[slug] || CURACIONES_VISUALES[fileName.replace(/\.(md|mdx)$/, '')];

  if (curacion) {
    console.log(`✨ [REPARACIÓN VISUAL DISPONIBLE] ${fileName} (${slug})`);
    console.log(`   ↳ Nueva Cover: ${curacion.cover}`);

    if (isApplyMode) {
      let updatedContent = content;

      // Actualizar coverImage
      updatedContent = updatedContent.replace(
        /coverImage:\s*["']?[^"'\r\n]*["']?/,
        `coverImage: "${curacion.cover}"`
      );

      // Actualizar gallery
      if (curacion.gallery && curacion.gallery.length > 0) {
        const galleryYaml = ['gallery:', ...curacion.gallery.map(g => `  - "${g}"`)].join('\n');
        updatedContent = updatedContent.replace(/gallery:\s*(\[[^\]]*\]|(?:\r?\n\s*-\s*["']?[^"'\r\n]+["']?)+)/, galleryYaml);
      }

      // Desactivar draft si corresponde
      if (curacion.setDraftFalse) {
        updatedContent = updatedContent.replace(/draft:\s*true/i, 'draft: false');
      }

      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`   ✔ Post actualizado y curado con éxito.`);
      repairsApplied++;
    } else {
      console.log(`   ℹ️ [Dry-Run] Se inyectaría la imagen y galería auténtica (usar --apply para ejecutar)`);
    }
    console.log('');
  }
}

console.log('════════════════════════════════════════════════════════════');
console.log('📊 RESUMEN DE LA AUDITORÍA / SANACIÓN:');
console.log(`   • Borradores truncados/duplicados detectados: ${BORRADORES_OBSOLETOS.length} (${isApplyMode ? 'Depurados: ' + duplicatesPruned : 'Pendientes de depurar'})`);
console.log(`   • Posteos con curación visual aplicada/lista: ${Object.keys(CURACIONES_VISUALES).length} (${isApplyMode ? 'Aplicados: ' + repairsApplied : 'Simulados en dry-run'})`);
console.log(`   • Stubs de testeo identificados:              ${stubsFound}`);
if (!isApplyMode) {
  console.log('\n💡 Para aplicar estas reparaciones en caliente ejecuta:');
  console.log('   node scripts/reparar-y-sanear-posteos.mjs --apply');
  console.log('   o bien: npm run fix:posts');
}
console.log('════════════════════════════════════════════════════════════\n');
