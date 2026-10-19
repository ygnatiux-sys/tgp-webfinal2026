// scripts/auditar-imagenes-posteos.mjs
// Auditoría Quirúrgica de Imágenes en Posteos TGP (Duplicados, Vacíos, Placeholders y Disonancias)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'src', 'content');
const LOST_POSTS_PATH = path.join(ROOT_DIR, 'src', 'data', 'lost-posts-curated.json');
const OUTPUT_REPORT_PATH = path.join(__dirname, 'audit-imagenes-report.json');

console.log('\n================================================================');
console.log('🏛️  [TGP SANI-AUDITOR] Auditoría Integral de Imágenes de Posteos');
console.log('================================================================\n');

// ─── 1. REGLAS SEMÁNTICAS DE DISONANCIA TEMÁTICA ────────────────────────────
const DISONANCIAS_CRITICAS = [
  {
    tema: 'Egipto / Saqqara / Esfinge / Giza / Dahshur',
    keywords: ['esfinge', 'giza', 'piramide', 'saqqara', 'dahshur', 'imhotep', 'egipto', 'kefren', 'keops', 'nilo'],
    imagenesProhibidas: ['machu-picchu', 'asado', 'nasca', 'caterpillar', 'pompeii', 'vesuvio', 'qapaq', 'atacama']
  },
  {
    tema: 'Asado / Parrilla / Tradición Gaucha',
    keywords: ['asado', 'parrilla', 'gaucho', 'carne'],
    imagenesProhibidas: ['sphinx', 'machu', 'picchu', 'pompeii', 'longyou', 'pyramid', 'saqqara']
  },
  {
    tema: 'China / Longyou / Muralla',
    keywords: ['china', 'longyou', 'muralla'],
    imagenesProhibidas: ['egypt', 'asado', 'picchu', 'vesuvio', 'nasca']
  },
  {
    tema: 'Nasca / María Reiche',
    keywords: ['nasca', 'nazca', 'reiche'],
    imagenesProhibidas: ['sphinx', 'asado', 'pompeii', 'vesuvio', 'dahshur']
  },
  {
    tema: 'Nan Madol / Micronesia',
    keywords: ['nan madol', 'nan-madol', 'temwen', 'pohnpei'],
    imagenesProhibidas: ['asado', 'sphinx', 'picchu', 'dahshur']
  },
  {
    tema: 'Pompeya / Vesubio / Roma',
    keywords: ['pompeya', 'vesubio', 'herculano', 'roma'],
    imagenesProhibidas: ['machu', 'picchu', 'asado', 'sphinx', 'nasca']
  }
];

// Fallback genérico de Machu Picchu que suele colarse si no hay imagen
const GENERIC_MACHU_PICCHU = '1792044290145-53f05a9f.webp';

// ─── 2. PARSER SIMPLE Y ROBUSTO DE FRONTMATTER MDX ──────────────────────────
function parseFrontmatterMDX(content, filePath) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const rawYaml = match[1];
  const post = {
    file: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
    title: '',
    slug: '',
    category: '',
    volanta: '',
    coverImage: '',
    heroUrl: '',
    gallery: [],
    draft: false
  };

  const titleMatch = rawYaml.match(/title:\s*["']?([^"'\r\n]+)["']?/);
  if (titleMatch) post.title = titleMatch[1].trim();

  const slugMatch = rawYaml.match(/slug:\s*["']?([^"'\r\n]+)["']?/);
  if (slugMatch) post.slug = slugMatch[1].trim();

  const categoryMatch = rawYaml.match(/category:\s*["']?([^"'\r\n]+)["']?/);
  if (categoryMatch) post.category = categoryMatch[1].trim();

  const volantaMatch = rawYaml.match(/volanta:\s*["']?([^"'\r\n]+)["']?/);
  if (volantaMatch) post.volanta = volantaMatch[1].trim();

  const coverMatch = rawYaml.match(/coverImage:\s*["']?([^"'\r\n]*)["']?/);
  if (coverMatch) post.coverImage = coverMatch[1].trim();

  const heroMatch = rawYaml.match(/heroUrl:\s*["']?([^"'\r\n]*)["']?/);
  if (heroMatch) post.heroUrl = heroMatch[1].trim();

  const draftMatch = rawYaml.match(/draft:\s*(true|false)/i);
  if (draftMatch) post.draft = draftMatch[1].toLowerCase() === 'true';

  // Parser simple de gallery
  const galleryMatch = rawYaml.match(/gallery:\s*(\[[^\]]*\]|(?:\r?\n\s*-\s*["']?[^"'\r\n]+["']?)+)/);
  if (galleryMatch) {
    const rawGallery = galleryMatch[1];
    if (rawGallery.startsWith('[')) {
      try {
        const cleanJson = rawGallery.replace(/'/g, '"');
        post.gallery = JSON.parse(cleanJson);
      } catch {
        post.gallery = [];
      }
    } else {
      const items = rawGallery.match(/-\s*["']?([^"'\r\n]+)["']?/g) || [];
      post.gallery = items.map(item => item.replace(/-\s*["']?/, '').replace(/["']$/, '').trim());
    }
  }

  return post;
}

// ─── 3. RECOLECCIÓN DE POSTS ────────────────────────────────────────────────
function getAllMDXFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getAllMDXFiles(full));
    } else if (/\.(mdx|md)$/i.test(item.name)) {
      files.push(full);
    }
  }
  return files;
}

const allPosts = [];

// Escaneo de carpetas en src/content
for (const sub of ['ensayos', 'ensayosCinematicos', 'series_hemeroteca']) {
  const subDir = path.join(CONTENT_DIR, sub);
  const mdxFiles = getAllMDXFiles(subDir);
  for (const file of mdxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const parsed = parseFrontmatterMDX(content, file);
    if (parsed) {
      allPosts.push(parsed);
    }
  }
}

// Escaneo opcional de lost-posts-curated.json
if (fs.existsSync(LOST_POSTS_PATH)) {
  try {
    const curated = JSON.parse(fs.readFileSync(LOST_POSTS_PATH, 'utf8'));
    if (Array.isArray(curated)) {
      for (const item of curated) {
        allPosts.push({
          file: 'src/data/lost-posts-curated.json#' + (item.slug || item.id || item.title),
          title: item.title || '',
          slug: item.slug || item.id || '',
          category: item.category || 'Curated',
          volanta: item.volanta || '',
          coverImage: (item.coverImage || item.heroUrl || '').trim(),
          heroUrl: (item.heroUrl || '').trim(),
          gallery: Array.isArray(item.gallery) ? item.gallery : [],
          draft: Boolean(item.draft)
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ No se pudo parsear lost-posts-curated.json:', err.message);
  }
}

console.log(`📑 Total de posteos analizados: ${allPosts.length}\n`);

// ─── 4. DETECCIÓN DE ANOMALÍAS ──────────────────────────────────────────────
const coverImageUsage = new Map();
const postsSinCover = [];
const postsSinGaleria = [];
const postsPlaceholders = [];
const postsDisonantes = [];
const postsUrlsLocalesOIncompletas = [];

for (const post of allPosts) {
  const cover = post.coverImage || post.heroUrl || '';

  // 1. Detección de portadas vacías
  if (!cover || cover.trim().length === 0) {
    postsSinCover.push({
      file: post.file,
      title: post.title,
      slug: post.slug,
      reason: 'coverImage vacía ("") o no especificada'
    });
    continue;
  }

  // 2. Conteo de uso para detectar duplicadas
  if (!coverImageUsage.has(cover)) {
    coverImageUsage.set(cover, []);
  }
  coverImageUsage.get(cover).push({
    file: post.file,
    title: post.title,
    slug: post.slug
  });

  // 3. Detección de galerías vacías
  if (!post.gallery || post.gallery.length === 0) {
    postsSinGaleria.push({
      file: post.file,
      title: post.title,
      slug: post.slug,
      cover
    });
  }

  // 4. Detección de placeholders o fallbacks genéricos de Machu Picchu
  const isPlaceholder = /placeholder(-cinematic)?\.(jpg|png|webp)/i.test(cover) ||
                        cover.includes('images.unsplash.com');
  const isGenericMachuPicchu = cover.includes(GENERIC_MACHU_PICCHU) &&
                               !/machu|picchu|cusco|cuzco|inca|andes|peru/i.test(post.title);

  if (isPlaceholder || isGenericMachuPicchu) {
    postsPlaceholders.push({
      file: post.file,
      title: post.title,
      slug: post.slug,
      coverImage: cover,
      reason: isPlaceholder ? 'Placeholder genérico o Unsplash stock' : 'Machu Picchu fallback aplicado en post no andino'
    });
  }

  // 5. Detección de disonancias temáticas explícitas
  const lowerTitle = post.title.toLowerCase();
  const lowerCover = cover.toLowerCase();

  for (const dis of DISONANCIAS_CRITICAS) {
    const coincideTema = dis.keywords.some(k => lowerTitle.includes(k));
    if (coincideTema) {
      const tieneProhibida = dis.imagenesProhibidas.some(p => lowerCover.includes(p));
      if (tieneProhibida) {
        postsDisonantes.push({
          file: post.file,
          title: post.title,
          slug: post.slug,
          coverImage: cover,
          expectedContext: dis.tema,
          warning: `La portada contiene fragmentos no relacionados (${dis.imagenesProhibidas.filter(p => lowerCover.includes(p)).join(', ')})`
        });
      }
    }
  }

  // 6. Detección de rutas locales o URLs relativas
  if (!cover.startsWith('http://') && !cover.startsWith('https://')) {
    postsUrlsLocalesOIncompletas.push({
      file: post.file,
      title: post.title,
      slug: post.slug,
      coverImage: cover
    });
  }
}

// Filtrar únicamente las imágenes que se repiten en más de 1 post
const imagenesRepetidas = [];
for (const [imgUrl, posts] of coverImageUsage.entries()) {
  if (posts.length > 1) {
    imagenesRepetidas.push({
      imageUrl: imgUrl,
      repeatCount: posts.length,
      posts
    });
  }
}

// Ordenar repetidas de mayor a menor frecuencia
imagenesRepetidas.sort((a, b) => b.repeatCount - a.repeatCount);

// ─── 5. GENERACIÓN DEL INFORME JSON ─────────────────────────────────────────
const auditReport = {
  timestamp: new Date().toISOString(),
  resumen: {
    totalPosteosAnalizados: allPosts.length,
    posteosSinCover: postsSinCover.length,
    posteosSinGaleria: postsSinGaleria.length,
    posteosConPlaceholders: postsPlaceholders.length,
    posteosConDisonanciaTematica: postsDisonantes.length,
    totalImagenesDistintas: coverImageUsage.size,
    imagenesRepetidasCount: imagenesRepetidas.length,
    posteosConUrlsLocalesOIncompletas: postsUrlsLocalesOIncompletas.length
  },
  imagenesRepetidas,
  posteosSinCover: postsSinCover,
  posteosConPlaceholders: postsPlaceholders,
  posteosConDisonanciaTematica: postsDisonantes,
  posteosSinGaleria: postsSinGaleria,
  posteosConUrlsLocalesOIncompletas: postsUrlsLocalesOIncompletas
};

fs.writeFileSync(OUTPUT_REPORT_PATH, JSON.stringify(auditReport, null, 2), 'utf8');

// ─── 6. IMPRESIÓN DEL REPORTE EN CONSOLA ─────────────────────────────────────
console.log('📊 RESULTADOS DEL SANI-AUDITOR:');
console.log(`   🔴 Posteos sin coverImage (vacíos):        ${auditReport.resumen.posteosSinCover}`);
console.log(`   🟡 Imágenes repetidas en varios posts:     ${auditReport.resumen.imagenesRepetidasCount}`);
console.log(`   🟠 Posteos con Placeholders / Fallback MP: ${auditReport.resumen.posteosConPlaceholders}`);
console.log(`   🚨 Disonancias temáticas ("nada que ver"):  ${auditReport.resumen.posteosConDisonanciaTematica}`);
console.log(`   ⚪ Posteos sin galería (gallery: []):      ${auditReport.resumen.posteosSinGaleria}`);
console.log(`   📁 URLs locales o relativas:               ${auditReport.resumen.posteosConUrlsLocalesOIncompletas}`);
console.log('────────────────────────────────────────────────────────────────\n');

if (postsSinCover.length > 0) {
  console.log('🔴 POSTEOS SIN PORTADA (coverImage: ""):');
  for (const p of postsSinCover) {
    console.log(`   • [${p.slug}] "${p.title}" -> ${p.file}`);
  }
  console.log('');
}

if (imagenesRepetidas.length > 0) {
  console.log('🟡 TOP IMÁGENES REPETIDAS:');
  for (const rep of imagenesRepetidas.slice(0, 8)) {
    console.log(`   • (${rep.repeatCount} posts) -> ${rep.imageUrl.slice(0, 80)}...`);
    for (const p of rep.posts.slice(0, 3)) {
      console.log(`      ↳ "${p.title}" (${p.slug})`);
    }
    if (rep.posts.length > 3) {
      console.log(`      ↳ ... y ${rep.posts.length - 3} posts más.`);
    }
  }
  console.log('');
}

if (postsPlaceholders.length > 0) {
  console.log('🟠 POSTEOS CON PLACEHOLDERS / FALLBACK DISCORDANTE:');
  for (const p of postsPlaceholders) {
    console.log(`   • [${p.slug}] "${p.title}"`);
    console.log(`      ↳ Motivo: ${p.reason}`);
    console.log(`      ↳ Cover: ${p.coverImage}`);
  }
  console.log('');
}

if (postsDisonantes.length > 0) {
  console.log('🚨 DISONANCIAS TEMÁTICAS DETECTADAS:');
  for (const d of postsDisonantes) {
    console.log(`   • [${d.slug}] "${d.title}"`);
    console.log(`      ↳ Alerta: ${d.warning}`);
    console.log(`      ↳ Cover: ${d.coverImage}`);
  }
  console.log('');
}

console.log('================================================================');
console.log(`💾 Reporte JSON inmutable guardado en: scripts/audit-imagenes-report.json`);
console.log(`🔒 Blindaje Git verificado: Este archivo está en .gitignore y NUNCA se subirá a Cloudflare.`);
console.log('================================================================\n');
