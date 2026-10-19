// scripts/forjar-loop.mjs
// Motor Unificado y Parametrizado de Video Loops Cinematográficos TGP
// Soporta temas pre-curados (Derinkuyu, Nan Madol, Nasca, Esfinge) o generación dinámica con Gemini Flash
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');

// Cargar variables de entorno locales
if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      const val = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const PIN = (process.env.VAULT_PIN || '2771').trim();
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
const CLOUD_RENDER_URL = 'https://tgp-mind-alternative-713934653057.us-central1.run.app/render-cinematico';

// ─── 1. PARSER DE ARGUMENTOS CLI ─────────────────────────────────────────────
const args = process.argv.slice(2);
let tema = 'Derinkuyu';
let backend = 'cloud'; // 'cloud' | 'local'

for (const arg of args) {
  if (arg.startsWith('--tema=')) {
    tema = arg.replace('--tema=', '').trim();
  } else if (arg.startsWith('--backend=')) {
    backend = arg.replace('--backend=', '').trim();
  } else if (arg === '--local') {
    backend = 'local';
  } else if (arg === '--cloud') {
    backend = 'cloud';
  }
}

console.log('\n================================================================');
console.log(`🎞️  [TGP FORJADOR DE LOOPS] Render Cinematográfico Parametrizado`);
console.log(`📌 Tema: "${tema}" | Backend: ${backend.toUpperCase()}`);
console.log('================================================================\n');

// ─── 2. PRESETS TEMÁTICOS CURATORIALES ───────────────────────────────────────
const PRESETS = {
  derinkuyu: {
    titulo: 'Derinkuyu: El Laberinto Subterráneo de Capadocia',
    slug: 'derinkuyu-loop',
    texto: 'Una megalópolis vertical de once niveles excavada en toba volcánica que albergó a veinte mil almas en el corazón de Anatolia.',
    imageUrls: [
      'https://storage.thegreatpuzzleproject.com/vault-media/1792137342460-4f977b70.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792133914689-44dd5943.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792137345528-f304bb0d.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792137350453-b90ec716.webp'
    ],
    planos: [
      { id: 'frame-01', titulo: 'Laberinto de Toba Volcánica', desc: 'Underground corridors of Derinkuyu carved into volcanic tuff. Chiaroscuro lighting, warm oil lamp glow, 16:9 widescreen, National Geographic archaeology photography.' },
      { id: 'frame-02', titulo: 'Puerta Rodante Tirhaz', desc: 'Colossal circular stone millstone door sealing ancient subterranean passageway. Dramatic side rim light revealing chisel marks, 16:9 35mm film aesthetic.' },
      { id: 'frame-03', titulo: 'Pozo de Ventilación 55m', desc: 'Downward angle into vertical ventilation shaft of Derinkuyu plunging 55m. Sunlight beams filtering from surface, sublime scale, Tarkovsky framing.' },
      { id: 'frame-04', titulo: 'Iglesia Cruciforme Nivel 7', desc: 'Vast cruciforme cavern hall deep underground. Pillars carved directly out of living bedrock, mystical subterranean gloom, cinematic dark academia.' }
    ]
  },
  'nan-madol': {
    titulo: 'Nan Madol: La Venecia Megalítica de Micronesia',
    slug: 'nan-madol-loop',
    texto: 'Una metrópoli megalítica suspendida sobre noventa islotes artificiales de basalto columnar en el arrecife de Pohnpei.',
    imageUrls: [
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217505902-206dbd92.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217519518-b5ba057e.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217532545-045e2f7b.webp'
    ],
    planos: [
      { id: 'frame-01', titulo: 'Canales Cenitales al Amanecer', desc: 'Aerial panoramic shot of artificial islets of Nan Madol in turquoise ocean waters, misty sunrise, National Geographic archaeological realism.' },
      { id: 'frame-02', titulo: 'Muro Ciclópeo Nan Douwas', desc: 'Monumental columnar basalt cross-stacked log walls, tropical rainforest vegetation, tactile volcanic stone texture, 35mm lens.' },
      { id: 'frame-03', titulo: 'La Cripta Real', desc: 'Low angle shot of colossal tomb threshold in Nan Douwas, tropical sun rays penetrating rock joints, solemn Tarkovsky atmosphere.' },
      { id: 'frame-04', titulo: 'Manglares y Disolución', desc: 'Red mangrove roots strangling submerged basalt log platforms, poetic reflection of ruins in tidal waters, 16:9 cinematic.' }
    ]
  },
  nasca: {
    titulo: 'Líneas de Nasca: El Códice de la Pampa',
    slug: 'nasca-loop',
    texto: 'Geometría sagrada y geoglifos trazados sobre la pampa ocre de Jumana, audibles solo para el vuelo y los dioses.',
    imageUrls: [
      'https://storage.thegreatpuzzleproject.com/vault-media/nasca/nasca-colibri-hero-sky.png',
      'https://upload.wikimedia.org/wikipedia/commons/e/ec/Nazca_Lines_-_Spiral.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b3/L%C3%ADneas_de_Nazca%2C_Nazca%2C_Per%C3%BA%2C_2015-07-29%2C_DD_53.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/4/46/Nazca_lines_spider.jpg'
    ],
    planos: [
      { id: 'frame-01', titulo: 'El Colibrí Monumental', desc: 'Aerial vertical view of the giant Hummingbird geoglyph in Nazca desert, golden dawn light casting subtle shadows on oxide crust, 16:9.' },
      { id: 'frame-02', titulo: 'Líneas Infinitas hacia el Horizonte', desc: 'Low skimming flight perspective along a dead-straight geoglyphic trapezoid pointing towards Andes mountain horizon.' },
      { id: 'frame-03', titulo: 'El Espiral de Jumana', desc: 'Geometric spiral etched into dark oxidized plateau stones revealing lighter subsoil, tactile stone detail, master archaeology shot.' },
      { id: 'frame-04', titulo: 'El Centinela / El Búho', desc: 'Wide shot of the hillside figure known as the Owl Man, late afternoon dramatic shadows across coastal desert plain, 35mm cinematic.' }
    ]
  },
  esfinge: {
    titulo: 'La Esfinge de Giza: El Centinela del Tiempo Profundo',
    slug: 'esfinge-giza-loop',
    texto: 'La colosal mole caliza que custodia el plateau de Giza, cuyas fisuras verticales susurran precipitaciones de una era antediluviana.',
    imageUrls: [
      'https://upload.wikimedia.org/wikipedia/commons/c/c5/Egypt.Giza.Sphinx.01.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/9/90/Great_Sphinx_of_Giza_9049.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/2/23/Sphinx_partially_excavated2.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/e/ea/Great_Sphinx_of_Giza_2.jpg'
    ],
    planos: [
      { id: 'frame-01', titulo: 'Erosión Hídrica del Foso', desc: 'Close-up texture of deep undulating vertical water erosion channels carved into limestone bedrock enclosure of the Great Sphinx, warm raking sunlight.' },
      { id: 'frame-02', titulo: 'Perfil Monumental hacia el Este', desc: 'Side profile of Great Sphinx facing morning sunrise, Khafre pyramid blurred in distant haze, timeless Borgesian solitude.' },
      { id: 'frame-03', titulo: 'El Templo del Valle', desc: 'Colossal megalithic limestone core blocks faced with Aswan granite casing in Sphinx temple, sublime Cyclopean masonry.' },
      { id: 'frame-04', titulo: 'Cenital al Atardecer', desc: 'High cinematic crane shot of Giza plateau bathed in twilight blue and amber rays, enigmatic stone gaze fixed upon eternity.' }
    ]
  }
};

// ─── 3. RESOLVER O GENERAR GUION DE 4 PLANOS ────────────────────────────────
function normalizarKey(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

async function resolverGuion(temaParam) {
  const norm = normalizarKey(temaParam);
  for (const [key, preset] of Object.entries(PRESETS)) {
    if (norm.includes(normalizarKey(key))) {
      console.log(`✔ Preset encontrado para: "${preset.titulo}"`);
      return preset;
    }
  }

  console.log(`🤖 Generando guion cinematográfico dinámico con Gemini Flash para "${temaParam}"...`);
  if (!GEMINI_KEY) {
    throw new Error('Se requiere GEMINI_API_KEY para forjar temas dinámicos fuera de presets.');
  }

  const prompt = `Actúa como perito arqueológico y director de fotografía de The Great Puzzle Project. 
Para el tema "${temaParam}", redacta en JSON un guion de 4 planos cinematográficos (16:9, estética documental realista, sin kitsch) y un micro-copy de portada.
Formato JSON estricto:
{
  "titulo": "Título de Autor",
  "slug": "slug-loop",
  "texto": "Una o dos líneas de prosa borgeana profunda.",
  "imageUrls": [
    "https://storage.thegreatpuzzleproject.com/vault-media/1792137342460-4f977b70.webp",
    "https://storage.thegreatpuzzleproject.com/vault-media/1792133914689-44dd5943.webp",
    "https://storage.thegreatpuzzleproject.com/vault-media/1792137345528-f304bb0d.webp",
    "https://storage.thegreatpuzzleproject.com/vault-media/1792137350453-b90ec716.webp"
  ],
  "planos": [
    { "id": "frame-01", "titulo": "Plano 1", "desc": "Prompt en inglés para Imagen 3, 16:9, hiperdetallado, fotografía arqueológica documental" },
    { "id": "frame-02", "titulo": "Plano 2", "desc": "Prompt en inglés de arquitectura/cantería de detalle" },
    { "id": "frame-03", "titulo": "Plano 3", "desc": "Prompt en inglés de perspectiva o umbral" },
    { "id": "frame-04", "titulo": "Plano 4", "desc": "Prompt en inglés de atmósfera cenital/atardecer" }
  ]
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText);
}

// ─── 4. EJECUTOR DE RENDERIZADO ──────────────────────────────────────────────
async function forjarLoop() {
  try {
    const guion = await resolverGuion(tema);

    console.log(`\n🎬 GUION CINEMATOGRÁFICO:`);
    console.log(`   📌 Título: ${guion.titulo}`);
    console.log(`   📝 Texto:  ${guion.texto}`);
    guion.planos.forEach((p, idx) => {
      console.log(`   [Plano ${idx + 1}] ${p.titulo}: ${p.desc.slice(0, 70)}...`);
    });
    console.log('');

    if (backend === 'cloud') {
      console.log(`🚀 Enviando orden de render al motor Remotion en Cloud Run vía tgp-mind-alternative...`);
      const payload = {
        titulo: guion.titulo,
        slug: guion.slug,
        texto: guion.texto,
        template: 'CLASICO',
        rhythm: 'LENTO',
        imageUrls: guion.imageUrls || [],
        planos: guion.planos
      };

      const res = await fetch(CLOUD_RENDER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PIN}`
        },
        body: JSON.stringify(payload)
      });

      console.log(`📡 Respuesta Cloud Run Status: ${res.status}`);
      const reply = await res.text();
      console.log(`📋 Detalle:\n${reply}\n`);
    } else {
      console.log(`⚙️ Modo local seleccionado. Verificando entorno de Remotion local...`);
      const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION';
      if (!fs.existsSync(REMOTION_DIR)) {
        console.warn(`⚠️ No se encontró directorio local de Remotion en ${REMOTION_DIR}.`);
        console.log(`👉 Sugerencia: utiliza el backend en la nube con: node scripts/forjar-loop.mjs --cloud`);
        return;
      }
      console.log(`✔ Remotion local detectado en ${REMOTION_DIR}.`);
    }

    console.log('✅ Operación de forja completada exitosamente.');
  } catch (err) {
    console.error('❌ Error forjando loop:', err.message);
    process.exit(1);
  }
}

forjarLoop();
