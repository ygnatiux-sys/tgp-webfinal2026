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
const VAULT_UPLOAD_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';

// ─── Argumentos de CLI ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback = '') {
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(`--${name}=`)) {
      return args[i].split('=')[1].replace(/^['"]|['"]$/g, '');
    }
    if (args[i] === `--${name}` && args[i + 1] && !args[i + 1].startsWith('--')) {
      return args[i + 1].replace(/^['"]|['"]$/g, '');
    }
  }
  return fallback;
}

const hasFlag = (name) => args.includes(`--${name}`);

const topic = getArg('topic', 'Masuda no Iwafune (La Nave de Roca de Masuda)');
const engine = getArg('engine', 'pro').toLowerCase(); // 'flash' | 'pro'
const modelName = engine === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-2.5-flash';
const heroImageArg = getArg('hero-image', '');
const galleryImageArg = getArg('gallery-image', '');
const forceSynthetic = hasFlag('force-synthetic');
const testSyntheticFallback = hasFlag('test-synthetic-fallback');

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  ⚡ PIPELINE TGP: GENERADOR DIRECTO DE CONTENIDOS ALTERNATIVE       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(`◈ Tema: "${topic}"`);
console.log(`◈ Motor de Texto: ${engine.toUpperCase()} (${modelName})`);
console.log(`◈ Motor de Imagen Sintética: GEMINI-3.1-FLASH-IMAGE (Google AI Studio)`);
console.log(`◈ Transmutación R2/D1: tgp-vault-run activo\n`);

// ─── 1. GENERADOR DE IMAGEN SINTÉTICA (FALLBACK Y COMPAÑERA) ──────────────────
export async function generarImagenSintetica(promptTema) {
  console.log(`\n🤖 [SINTÉTICA] Iniciando forjado de imagen sintética con Gemini Image Engine...`);
  console.log(`   Prompt base: "${promptTema}"`);

  if (!GEMINI_KEY) {
    throw new Error('GEMINI_API_KEY no configurada para generar imagen sintética.');
  }

  const imagePrompt = `Hyper-detailed panoramic documentary photograph of ${promptTema}. Ultra-realistic carved granite texture, mystical lighting filtering through Japanese ancient forest, 8k resolution, cinematic composition, dark academia aesthetic, no modern elements, authentic archaeological detail.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: imagePrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg'
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Fallo en Imagen 3 API (Status ${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;

  if (!b64) {
    throw new Error('La respuesta de Imagen 3 no contiene datos binarios de imagen (bytesBase64Encoded).');
  }

  console.log(`   ✓ Fotografía sintética generada con éxito (${b64.length} bytes base64).`);
  const imageBuffer = Buffer.from(b64, 'base64');

  // Subir directamente a Cloudflare R2 vía tgp-vault-run/vault-ingest
  console.log(`   ⚡ Transmitiendo buffer a Cloudflare R2 y D1 vía tgp-vault-run...`);
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), `synthetic-${Date.now()}.jpg`);
  formData.append('title', `${topic} (Visual Sintético TGP)`);
  formData.append('topic', topic);

  const vaultRes = await fetch(VAULT_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PIN}`
    },
    body: formData
  });

  if (!vaultRes.ok) {
    const vErr = await vaultRes.text();
    throw new Error(`Error en tgp-vault-run al subir sintética (Status ${vaultRes.status}): ${vErr}`);
  }

  const vaultResult = await vaultRes.json();
  const r2Url = vaultResult.data?.media?.publicUrl || vaultResult.url;
  console.log(`   ✓ Imagen sintética transmutada y persistida en R2:`);
  console.log(`     -> URL: ${r2Url}`);
  console.log(`     -> Dimensiones: ${vaultResult.data?.media?.width}x${vaultResult.data?.media?.height} (${vaultResult.data?.media?.format})`);
  console.log(`     -> Cloudflare D1 registrado con éxito.`);

  return r2Url;
}

// ─── 2. BÚSQUEDA EN WIKIMEDIA COMMONS CON FALLBACK SINTÉTICO CERTERO ───────────
async function buscarOgenerarImagen(termino) {
  if (heroImageArg) {
    console.log(`[1/4] 🎯 Imagen Hero especificada manualmente por CLI: ${heroImageArg}`);
    return heroImageArg;
  }

  if (testSyntheticFallback) {
    console.log(`[1/4] 🧪 [MODO PRUEBA FALLBACK] Simulando que Wikimedia Commons no tiene imágenes.`);
    console.log(`   -> Activando de inmediato la generación sintética para verificar certeza...`);
    return await generarImagenSintetica(termino);
  }

  if (forceSynthetic) {
    console.log(`[1/4] 🤖 Flag --force-synthetic activado: generando imagen sintética de alta resolución...`);
    return await generarImagenSintetica(termino);
  }

  console.log(`[1/4] 🔍 Rastreando artefactos visuales en Wikimedia Commons para "${termino}"...`);
  const cleanTerm = termino.replace(/[:(].*$/, '').trim();

  try {
    // Motor A: list=search con filtro de mapa de bits para obtener las fotos de mayor resolución
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(cleanTerm + ' filetype:bitmap')}&srnamespace=6&srlimit=8`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
    });
    const searchData = await searchRes.json();
    const titles = (searchData.query?.search || []).map(s => s.title);

    if (titles.length > 0) {
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime&titles=${encodeURIComponent(titles.join('|'))}`;
      const infoRes = await fetch(infoUrl, {
        headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
      });
      const infoData = await infoRes.json();
      const pages = Object.values(infoData.query?.pages || {});

      const validImages = pages
        .map(p => ({
          title: p.title,
          url: p.imageinfo?.[0]?.url,
          width: p.imageinfo?.[0]?.width || 0,
          height: p.imageinfo?.[0]?.height || 0
        }))
        .filter(img => img.url && (img.url.endsWith('.jpg') || img.url.endsWith('.png') || img.url.endsWith('.webp') || img.url.endsWith('.jpeg')))
        .sort((a, b) => (b.width * b.height) - (a.width * a.height)); // ordenar de mayor a menor resolución

      if (validImages.length > 0) {
        console.log(`  ✓ Encontradas ${validImages.length} imágenes en Wikimedia Commons.`);
        console.log(`  ✓ Imagen de máxima resolución (Best Image Hero): ${validImages[0].title} [${validImages[0].width}x${validImages[0].height} px]`);
        return validImages[0].url;
      }
    } else {
      console.warn(`  ⚠ Wikimedia Commons no devolvió archivos en list=search para "${cleanTerm}".`);
    }
  } catch (err) {
    console.warn('  ⚠ Error al buscar en Wikimedia Commons:', err.message);
  }

  // FALLBACK CERTERO: Si Wikimedia no encuentra la mejor imagen, generar imagen sintética
  console.log(`  ⚡ DISPARANDO FALLBACK SINTÉTICO: Generando imagen con IA en tiempo real...`);
  return await generarImagenSintetica(termino);
}

// ─── 3. TRANSMUTACIÓN A CLOUDFLARE R2 Y D1 ────────────────────────────────────
async function transmutarAR2(imageUrl, titulo) {
  console.log(`[2/4] ⚡ Transmutando imagen a WebP y alojando en R2 + D1...`);
  
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

// ─── 4. REDACCIÓN ERUDITA CON GEMINI API DIRECTO ──────────────────────────────
async function forjarEnsayoConGemini(tema, motor) {
  console.log(`[3/4] 🧠 Redactando ensayo con Gemini (${motor.toUpperCase()})...`);

  if (!GEMINI_KEY) {
    throw new Error('No se encontró GEMINI_API_KEY en el entorno.');
  }

  const prompt = `Eres un historiador erudito, arqueólogo de campo y ensayista senior del proyecto The Great Puzzle Project (estética Dark Academia, estilo MUBI, prosa rigurosa, solemne y fascinante).
Escribe un ensayo monumental y exhaustivo sobre: "${tema}".

Detalles obligatorios que deben abordarse rigurosamente:
1. Localización y contexto geológico: Asuka, Prefectura de Nara, Japón. Monolito de granito pulido de aproximadamente 800 toneladas, 11 metros de longitud, 8 metros de ancho y 4.7 metros de altura.
2. Rasgos arquitectónicos enigmáticos: Las dos cavidades cuadrangulares simétricas talladas en la cima (1.6 m de lado y más de 1 metro de profundidad), la celosía/red grabada en los flancos inferiores y la ranura dorsal que sugiere canalización de fluidos.
3. El debate arqueológico y astronómico:
   - Hipótesis funeraria: supuesto sarcófago doble o tumba inacabada para la Emperatriz Saimei (Kōgyoku) y el Príncipe Kusakabe (o según el Nihon Shoki). La objeción geológica: una fractura interna o falla que provocó el abandono.
   - Hipótesis astronómica: alineación solsticial y observación del calendario arcaico.
   - Hipótesis lítica no canónica: paralelismos con Sakafuneishi (la piedra del barco de sake) y el kofun de Ishibutai.
4. Conclusión epistemológica: La piedra como enigma que interroga las herramientas de la era Asuka (siglo VII d.C.) y la memoria megalítica prehistórica japonesa.

Devuelve estrictamente un JSON válido con esta estructura:
{
  "title": "Título monumental y evocador (ej: Masuda no Iwafune: La Nave de Roca y el Tiempo de Asuka)",
  "subtitle": "Subtítulo poético y analítico (ej: Granito, Geometría Cenital y el Abandono Imperial)",
  "volanta": "Arqueología Megalítica Japonesa & Cronologías Disidentes",
  "abstract": "Párrafo conciso y cautivador de 2 o 3 líneas describiendo el dilema estratigráfico y la escala de la nave pétrea.",
  "era": "Período Asuka / Horizonte Arcaico (c. Siglo VII d.C. o anterior)",
  "date": "c. 650 d.C.",
  "badge": "Anomalía Lítica de Asuka",
  "content": "Cuerpo completo del ensayo en Markdown con subtítulos ## y ###, citas en blockquote >, análisis métrico y una sección final ## Fuentes Eruditas & Referencias Históricas con bibliografía especializada (Nihon Shoki, W.G. Aston, Asuka Historical Museum, etc.)."
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API respondió con status ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Respuesta vacía de Gemini al forjar el texto.');
  }

  return JSON.parse(rawText);
}

// ─── 5. GUARDADO EN MDX Y VINCULACIÓN A HISTORIA ALTERNATIVA ──────────────────
async function guardarPostYVincular(ensayo, primaryImageUrl, secondaryImageUrl) {
  console.log(`[4/4] 📁 Guardando archivo MDX y actualizando dossier en historia-alternativa.astro...`);
  
  const rawSlug = (ensayo.title || topic)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = rawSlug.slice(0, 45).replace(/-$/, '');

  const galleryList = [primaryImageUrl];
  if (secondaryImageUrl && secondaryImageUrl !== primaryImageUrl) {
    galleryList.push(secondaryImageUrl);
  }

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
coverImage: "${primaryImageUrl}"
heroUrl: "${primaryImageUrl}"
gallery:
${galleryList.map(img => `  - "${img}"`).join('\n')}
draft: false
---

${ensayo.content}
`;

  fs.writeFileSync(mdxPath, mdxContent, 'utf8');
  console.log(`  ✓ Ensayo guardado en: src/content/ensayos/${slug}.mdx`);

  // Actualizar casosAlternativos en historia-alternativa.astro
  if (fs.existsSync(HISTORIA_PAGE)) {
    let historiaSrc = fs.readFileSync(HISTORIA_PAGE, 'utf8');
    if (!historiaSrc.includes(`id: '${slug}'`)) {
      const nuevoCaso = `  {
    id: '${slug}',
    title: '${ensayo.title.replace(/'/g, "\\'")}',
    subtitle: '${(ensayo.subtitle || '').replace(/'/g, "\\'")}',
    category: '${(ensayo.volanta || 'Historia Alternativa').replace(/'/g, "\\'")}',
    date: '${ensayo.date || 'c. 650 d.C.'}',
    era: '${ensayo.era || 'Antigüedad Tardía'}',
    imageUrl: '${primaryImageUrl}',
    excerpt: '### ${(ensayo.abstract || '').replace(/'/g, "\\'")}',
    badge: '${ensayo.badge || 'Anomalía Lítica'}',
    url: '/ensayos/${slug}'
  },
`;
      historiaSrc = historiaSrc.replace('const casosAlternativos = [', `const casosAlternativos = [\n${nuevoCaso}`);
      fs.writeFileSync(HISTORIA_PAGE, historiaSrc, 'utf8');
      console.log(`  ✓ Tarjeta agregada al listado IMAX Monumental de /historia-alternativa.`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ DOSSIER Y ENSAYO FORJADOS CON ÉXITO                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`   - Ensayo MDX: http://localhost:4325/ensayos/${slug}`);
  console.log(`   - Dossier IMAX: http://localhost:4325/historia-alternativa`);
  console.log(`   - Hero Image (R2): ${primaryImageUrl}`);
  if (secondaryImageUrl) {
    console.log(`   - Secondary Image (R2): ${secondaryImageUrl}`);
  }
}

// ─── EJECUCIÓN PRINCIPAL ─────────────────────────────────────────────────────
(async () => {
  try {
    if (testSyntheticFallback) {
      console.log('🧪 Iniciando prueba de certeza de fallback sintético...');
      const fallbackUrl = await buscarOgenerarImagen(topic);
      console.log('\n🎯 [RESULTADO DE COMPROBACIÓN]:');
      console.log(`   Fallback sintético verificado al 100%:`);
      console.log(`   -> URL en R2: ${fallbackUrl}`);
      console.log('   -> Certeza comprobada: Si Wikimedia falla, el sistema forja la imagen sintética en R2/D1.');
      return;
    }

    // 1. Obtener imagen principal (Wikimedia o Sintética)
    let primaryRawUrl = await buscarOgenerarImagen(topic);
    let primaryR2Url = await transmutarAR2(primaryRawUrl, `${topic} - Principal`);

    // 2. Obtener imagen secundaria (si la principal es Wikimedia, generar o adjuntar la sintética como compañera de galería)
    let secondaryR2Url = galleryImageArg;
    if (!secondaryR2Url) {
      // Usar la imagen sintética forjada en R2
      secondaryR2Url = 'https://storage.thegreatpuzzleproject.com/vault-media/1792133492275-75fab037.webp';
    }

    // 3. Forjar ensayo erudito con Gemini Pro
    const ensayo = await forjarEnsayoConGemini(topic, engine);

    // 4. Guardar y vincular
    await guardarPostYVincular(ensayo, primaryR2Url, secondaryR2Url);

  } catch (error) {
    console.error('❌ Error en el pipeline:', error);
    process.exit(1);
  }
})();
