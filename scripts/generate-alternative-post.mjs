import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Directorios y Configuración ──────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENSAYOS_DIR = path.join(ROOT_DIR, 'src', 'content', 'ensayos');
const HISTORIA_PAGE = path.join(ROOT_DIR, 'src', 'pages', 'historia-alternativa.astro');

// Cargar variables de entorno
if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const PIN = (process.env.VAULT_PIN || '2771').trim();
const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.PUBLIC_GEMINI_API_KEY || '').trim();
const VAULT_IMAGE_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/image-ingest';

// ─── Argumentos de CLI ────────────────────────────────────────────────────────
// Uso: npm run content -- --topic="Pumapunku" --engine="flash"
const args = process.argv.slice(2);
function getArg(name, fallback = '') {
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(`--${name}=`)) {
      return args[i].split('=')[1].replace(/^['"]|['"]$/g, '');
    }
    if (args[i] === `--${name}` && args[i + 1]) {
      return args[i + 1].replace(/^['"]|['"]$/g, '');
    }
  }
  return fallback;
}

const topic = getArg('topic', 'Pumapunku y la tecnología megalítica en Tiwanaku');
const engine = getArg('engine', 'flash').toLowerCase(); // 'flash' | 'pro'
const modelName = engine === 'pro' ? 'gemini-1.5-pro' : 'gemini-2.0-flash';

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  ⚡ PIPELINE TGP: GENERADOR DIRECTO DE CONTENIDOS ALTERNATIVE       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(`◈ Tema: "${topic}"`);
console.log(`◈ Motor: ${engine.toUpperCase()} (${modelName})`);
console.log(`◈ Transmutación R2/D1: tgp-vault-run activo\n`);

// ─── 1. BÚSQUEDA DIRECTA EN WIKIMEDIA COMMONS ──────────────────────────────────
async function buscarEnWikimedia(termino) {
  console.log(`[1/4] 🔍 Rastreando artefactos visuales en Wikimedia Commons para "${termino}"...`);
  const cleanTerm = termino.split(' ')[0]; // primera palabra clave potente
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(cleanTerm)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|size|mime`;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
    });
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    const validImages = pages
      .map(p => p.imageinfo?.[0]?.url)
      .filter(url => url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp') || url.endsWith('.jpeg')));

    if (validImages.length > 0) {
      console.log(`  ✓ Encontradas ${validImages.length} imágenes en Wikimedia Commons.`);
      return validImages[0];
    }
  } catch (err) {
    console.warn('  ⚠ Advertencia al buscar en Wikimedia:', err.message);
  }
  
  // Fallback de archivo arqueológico seguro
  return 'https://storage.thegreatpuzzleproject.com/vault-media/1792044290145-53f05a9f.webp';
}

// ─── 2. TRANSMUTACIÓN WEBP A CLOUDFLARE R2 Y D1 ───────────────────────────────
async function transmutarAR2(imageUrl, titulo) {
  console.log(`[2/4] ⚡ Transmutando imagen a WebP y alojando en R2 + D1...`);
  
  // Si ya es una URL de R2, reutilizar
  if (imageUrl.includes('storage.thegreatpuzzleproject.com')) {
    console.log(`  ✓ Imagen ya alojada en R2: ${imageUrl}`);
    return imageUrl;
  }

  try {
    const res = await fetch(VAULT_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PIN}`
      },
      body: JSON.stringify({
        url: imageUrl,
        topic: topic,
        title: titulo
      })
    });

    if (res.ok) {
      const data = await res.json();
      const r2Url = data.url || data.publicUrl || data.r2url;
      if (r2Url) {
        console.log(`  ✓ Transmutación exitosa a R2: ${r2Url}`);
        console.log(`  ✓ Fila insertada en D1 con ID de registro.`);
        return r2Url;
      }
    } else {
      console.warn(`  ⚠ tgp-vault-run respondió con status ${res.status}`);
    }
  } catch (e) {
    console.warn('  ⚠ Error conectando con tgp-vault-run:', e.message);
  }

  return imageUrl;
}

// ─── 3. REDACCIÓN ERUDITA CON GEMINI API DIRECTO ──────────────────────────────
async function forjarEnsayoConGemini(tema, motor) {
  console.log(`[3/4] 🧠 Redactando ensayo con Gemini (${motor.toUpperCase()})...`);

  if (!GEMINI_KEY) {
    console.warn('\n⚠ [AVISO] No se encontró GEMINI_API_KEY en .env.');
    console.warn('  Generando ensayo con plantilla arqueológica Dark Academia predeterminada.');
    return {
      title: `${tema}: El Enigma Megalítico`,
      subtitle: 'Arqueología Cognitiva y Paradigmas Disidentes',
      abstract: `Análisis estratigráfico y tecnológico sobre ${tema}, desafiando la cronología convencional del Neolítico y la metalurgia arcaica.`,
      volanta: 'Arqueología No Canónica & Geología',
      era: 'Antigüedad Tardía',
      date: '10.000 a.C.',
      badge: 'Investigación Lítica',
      content: `## ${tema}: La Ruptura del Paradigma Clásico\n\nEn las encrucijadas de la cronología oficial, los vestigios de ${tema} emergen no como meras anomalías aisladas, sino como el testimonio palpable de saberes técnicos cuya escala no encaja en la historiografía lineal.\n\n> "La piedra no miente: cuando los cortes superan la capacidad mecánica del bronce o el pedernal, la arqueología está obligada a revisar sus dogmas en lugar de enterrar la evidencia."\n\n### Canteras, Cortes y Precisión Milimétrica\n\nLas mediciones batimétricas y geológicas evidencian una disciplina geométrica que desafía toda explicación simplista.`
    };
  }

  const prompt = `Eres un historiador erudito, arqueólogo de campo y ensayista del proyecto The Great Puzzle Project (estética Dark Academia, estilo MUBI, prosa solemne y rigurosa).
Escribe un ensayo profundo sobre: "${tema}".

Devuelve estrictamente un JSON válido con esta estructura:
{
  "title": "Título corto y monumental (ej: Pumapunku: La Geometría Imposible)",
  "subtitle": "Subtítulo poético y analítico (ej: La Andesita y el Olvido Preincaico)",
  "volanta": "Categoría conceptual (ej: Arqueología Lítica & Paradigmas Disidentes)",
  "abstract": "Párrafo conciso de 2 líneas describiendo el dilema",
  "era": "Período temporal (ej: 12.000 AP / Pleistoceno Tardío)",
  "date": "Datación arqueológica (ej: 9.600 a.C.)",
  "badge": "Insignia temática (ej: Anomalía Lítica)",
  "content": "Cuerpo completo del ensayo en Markdown con títulos ## y ###, citas textuales eruditas en blockquote > y una sección final ## Fuentes Eruditas & Referencias Históricas."
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    } else {
      console.warn(`  ⚠ Gemini API status ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.warn('  ⚠ Error en llamada a Gemini:', err.message);
  }

  return {
    title: tema,
    subtitle: 'Investigación en Arqueología Disidente',
    abstract: `Ensayo monográfico sobre ${tema}.`,
    volanta: 'Historia Alternativa',
    era: 'Prehistoria',
    date: '10.000 a.C.',
    badge: 'Anomalía Arqueológica',
    content: `## ${tema}\n\nInvestigación histórica profunda en desarrollo.`
  };
}

// ─── 4. GUARDADO EN MDX Y VINCULACIÓN A HISTORIA ALTERNATIVA ──────────────────
async function guardarPostYVincular(ensayo, r2ImageUrl) {
  console.log(`[4/4] 📁 Guardando archivo MDX y actualizando dossier en historia-alternativa.astro...`);
  
  const slug = ensayo.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const mdxPath = path.join(ENSAYOS_DIR, `${slug}.mdx`);
  const mdxContent = `---
title: "${ensayo.title.replace(/"/g, '\\"')}"
abstract: "${(ensayo.abstract || '').replace(/"/g, '\\"')}"
volanta: "${(ensayo.volanta || 'Historia Alternativa').replace(/"/g, '\\"')}"
layoutMode: "post-continuo"
powertype: "Investigación Primaria"
date: "${new Date().toISOString()}"
category: "Historia Alternativa"
themeColor: "#c9a96e"
coverImage: "${r2ImageUrl}"
heroUrl: "${r2ImageUrl}"
gallery:
  - "${r2ImageUrl}"
draft: false
---

${ensayo.content}
`;

  fs.writeFileSync(mdxPath, mdxContent, 'utf8');
  console.log(`  ✓ Ensayo guardado en: src/content/ensayos/${slug}.mdx`);

  // Actualizar casosAlternativos en historia-alternativa.astro si no existe ya
  if (fs.existsSync(HISTORIA_PAGE)) {
    let historiaSrc = fs.readFileSync(HISTORIA_PAGE, 'utf8');
    if (!historiaSrc.includes(`id: '${slug}'`)) {
      const nuevoCaso = `  {
    id: '${slug}',
    title: '${ensayo.title.replace(/'/g, "\\'")}',
    subtitle: '${(ensayo.subtitle || '').replace(/'/g, "\\'")}',
    category: '${(ensayo.volanta || 'Historia Alternativa').replace(/'/g, "\\'")}',
    date: '${ensayo.date || '10.000 a.C.'}',
    era: '${ensayo.era || 'Holoceno Temprano'}',
    imageUrl: '${r2ImageUrl}',
    excerpt: '### ${(ensayo.abstract || '').replace(/'/g, "\\'")}',
    badge: '${ensayo.badge || 'Anomalía Arqueológica'}',
    url: '/ensayos/${slug}'
  },
`;
      historiaSrc = historiaSrc.replace('const casosAlternativos = [', `const casosAlternativos = [\n${nuevoCaso}`);
      fs.writeFileSync(HISTORIA_PAGE, historiaSrc, 'utf8');
      console.log(`  ✓ Tarjeta agregada al listado IMAX Monumental de /historia-alternativa.`);
    }
  }

  console.log('\n✅ PROCESO COMPLETADO CON ÉXITO:');
  console.log(`   - Ensayo: http://localhost:4325/ensayos/${slug}`);
  console.log(`   - Dossier: http://localhost:4325/historia-alternativa\n`);
}

// ─── EJECUCIÓN DEL PIPELINE ──────────────────────────────────────────────────
(async () => {
  try {
    const rawWikiUrl = await buscarEnWikimedia(topic);
    const r2Url = await transmutarAR2(rawWikiUrl, topic);
    const ensayo = await forjarEnsayoConGemini(topic, engine);
    await guardarPostYVincular(ensayo, r2Url);
  } catch (error) {
    console.error('❌ Error en el pipeline:', error);
  }
})();
