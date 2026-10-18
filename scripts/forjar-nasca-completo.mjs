import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'scratch', 'nasca-loop');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Cargar Variables de Entorno
const localEnvPath = path.join(ROOT_DIR, '.env');
const vaultEnvPath = 'C:/Users/ygnat/TGP-Vault-Run/.env';

function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
      }
    }
  }
  return env;
}

const localEnv = loadEnvFile(localEnvPath);
const vaultEnv = loadEnvFile(vaultEnvPath);

const GEMINI_KEY = process.env.GEMINI_API_KEY || localEnv.GEMINI_API_KEY || vaultEnv.GEMINI_API_KEY;
const CLOUDFLARE_ACCOUNT_ID = vaultEnv.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = vaultEnv.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = vaultEnv.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = vaultEnv.R2_BUCKET_NAME || 'tgp-storage';
const R2_PUBLIC_DOMAIN = (vaultEnv.R2_PUBLIC_DOMAIN || 'storage.thegreatpuzzleproject.com').replace(/^https?:\/\//, '');

const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION';
const { bundle } = require(`${REMOTION_DIR}/node_modules/@remotion/bundler`);
const { renderMedia, selectComposition } = require(`${REMOTION_DIR}/node_modules/@remotion/renderer`);
const { S3Client, PutObjectCommand } = require(`${REMOTION_DIR}/node_modules/@aws-sdk/client-s3`);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

async function uploadBufferToR2(buffer, key, contentType = 'image/webp') {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  return `https://${R2_PUBLIC_DOMAIN}/${key}`;
}

// 2. Generador con Gemini Flash Image (gemini-2.5-flash-image:generateContent)
async function generarImagen(prompt, filename) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_KEY}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Image HTTP ${response.status}: ${errText.slice(0, 150)}`);
  }

  const data = await response.json();
  const inlinePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  const base64 = inlinePart?.inlineData?.data;
  if (!base64) throw new Error('Respuesta de Gemini Image sin inlineData base64');

  const buffer = Buffer.from(base64, 'base64');
  const key = `vault-media/nasca/${filename}`;
  const r2Url = await uploadBufferToR2(buffer, key, 'image/png');
  return r2Url;
}

// 3. Extractor de Imágenes Históricas de Wikimedia Commons
async function extraerBatchWikimedia(query, cantidad = 8) {
  console.log(`\n🔍 Consultando Wikimedia Commons para: "${query}"...`);
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query + ' filetype:bitmap')}&srnamespace=6&srlimit=15`;
  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
  });
  const data = await res.json();
  const titles = (data.query?.search || []).map(s => s.title);

  if (!titles.length) return [];

  const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime&titles=${encodeURIComponent(titles.join('|'))}`;
  const infoRes = await fetch(infoUrl, {
    headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
  });
  const infoData = await infoRes.json();
  const pages = Object.values(infoData.query?.pages || {});

  const validImages = pages
    .map(p => ({
      title: p.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''),
      url: p.imageinfo?.[0]?.url,
      width: p.imageinfo?.[0]?.width || 0,
      height: p.imageinfo?.[0]?.height || 0
    }))
    .filter(img => img.url && (img.url.endsWith('.jpg') || img.url.endsWith('.png') || img.url.endsWith('.jpeg')))
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .slice(0, cantidad);

  const r2Urls = [];
  for (let i = 0; i < validImages.length; i++) {
    const item = validImages[i];
    try {
      console.log(`   ⬇️ Descargando (${i + 1}/${validImages.length}): ${item.title}`);
      const imgRes = await fetch(item.url, {
        headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
      });
      if (!imgRes.ok) continue;
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = item.url.split('.').pop().toLowerCase();
      const key = `vault-media/nasca/wiki-nasca-batch-${String(i + 1).padStart(2, '0')}.${ext}`;
      const r2Url = await uploadBufferToR2(buffer, key, `image/${ext === 'png' ? 'png' : 'jpeg'}`);
      console.log(`   ✅ Alojad en R2: ${r2Url}`);
      r2Urls.push({ title: item.title, url: r2Url });
    } catch (err) {
      console.warn(`   ⚠️ Fallo al procesar imagen de wiki: ${err.message}`);
    }
  }
  return r2Urls;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  ⚡ PIPELINE MAESTRO TGP: NASCA Y MARÍA REICHE (LOOP + MAGAZINE)      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // A. Generar Hero Colibrí visto desde el cielo
  console.log('⚡ [1/4] Forjando Hero Colibrí con Google Imagen 3...');
  const promptHero = 'Classic aerial photograph taken from high altitude directly looking down at the Hummingbird (El Colibrí) geoglyph in the Nasca desert. Golden hour warm low-angle sunlight casting delicate shadows along the carved white gypsum trenches against the dark reddish-brown oxidized desert pavement. Master archaeological documentation, sharp lines, cinematic 16:9 widescreen, National Geographic style, no modern vehicles, no roads.';
  const heroUrl = await generarImagen(promptHero, 'nasca-colibri-hero-sky.png');
  console.log(`   ✅ Hero Colibrí R2: ${heroUrl}`);

  // B. Generar 4 Planos Golden Hour para el Loop Remotion
  console.log('\n⚡ [2/4] Forjando 4 Planos Cinematográficos en Golden Hour (16:9)...');
  const promptsLoop = [
    {
      id: 'plano-01-espiral',
      prompt: 'High-altitude aerial shot of the Spiral geoglyph in the Jumana Nasca desert during sunset golden hour. Deep orange and terracotta desert soil with the etched pale gypsum spiral glowing in raking evening light. Pristine historical atmosphere, cinematic 16:9, documentary perfection.'
    },
    {
      id: 'plano-02-arana',
      prompt: 'Aerial perspective of the Spider (La Araña) geoglyph in Nasca plateau. Late afternoon sun casting long precise shadows across the delicate carved legs and anatomical proportions on the stony pampa floor, warm golden hour tones, cinematic 16:9.'
    },
    {
      id: 'plano-03-mono',
      prompt: 'Spectacular aerial view of the Monkey (El Mono) with coiled tail geoglyph in the Nasca desert. Warm golden hour light illuminating the scraped white calcified ground against the iron-rich pebbles, cinematic 16:9 widescreen archaeology.'
    },
    {
      id: 'plano-04-trapecios',
      prompt: 'Monumental triangular and trapezoidal ritual plazas and long runways running to the desert horizon in Nasca. Low raking golden sunset light creating dramatic contrast across the vast plateau, sacred geometry, cinematic 16:9.'
    }
  ];

  const loopImages = [];
  for (const item of promptsLoop) {
    console.log(`   🎨 Generando ${item.id}...`);
    const url = await generarImagen(item.prompt, `nasca-${item.id}.png`);
    loopImages.push(url);
    console.log(`   ✅ R2: ${url}`);
    await new Promise(r => setTimeout(r, 1500));
  }

  // C. Extraer Batch de 8 Fotos de Wikimedia Commons para Magazine
  console.log('\n⚡ [3/4] Extrayendo Batch de 8 fotos de Wikimedia para Magazine 60/40...');
  const wikiBatch = await extraerBatchWikimedia('Maria Reiche Nazca lines', 8);

  // D. Renderizar Loop Remotion de 10s (300 frames @ 30fps)
  console.log('\n⚡ [4/4] Empaquetando y Renderizando Loop de 10 segundos con Remotion...');
  const bundleLocation = await bundle({
    entryPoint: `${REMOTION_DIR}/src/index.ts`,
  });

  const inputProps = {
    imageUrls: loopImages,
    duracionPorEscena: 90,
    duracionTransicion: 20
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'dark-academia-loop-16x9',
    inputProps,
  });

  const localMp4 = path.join(OUTPUT_DIR, 'nasca-reiche-hero-16x9.mp4');

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    crf: 28,
    outputLocation: localMp4,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 25 === 0) {
        console.log(`   🎬 Progreso de render: ${pct}%`);
      }
    }
  });

  const stats = fs.statSync(localMp4);
  console.log(`   🎉 Video MP4 renderizado localmente: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  console.log('⚡ Subiendo Master MP4 a Cloudflare R2...');
  const videoKey = 'vault-media/loops/nasca-reiche/nasca-reiche-hero-16x9.mp4';
  const videoBuffer = fs.readFileSync(localMp4);
  const videoR2Url = await uploadBufferToR2(videoBuffer, videoKey, 'video/mp4');

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('🎉 REPORTE MANDATORIO DE ASSETS PRODUCIDOS:');
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log(`1. HERO COLIBRÍ: ${heroUrl}`);
  console.log(`2. VIDEO LOOP 10S MP4: ${videoR2Url}`);
  console.log('3. 4 PLANOS LOOP GOLDEN HOUR:');
  loopImages.forEach((u, i) => console.log(`   [Plano ${i + 1}] ${u}`));
  console.log('4. BATCH DE 8 IMÁGENES WIKIMEDIA (MAGAZINE):');
  wikiBatch.forEach((w, i) => console.log(`   [Wiki ${i + 1}] ${w.title} -> ${w.url}`));
  console.log('══════════════════════════════════════════════════════════════════════\n');

  // Guardar metadata en JSON para consumo directo
  const manifest = {
    heroUrl,
    videoR2Url,
    loopImages,
    wikiBatch,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'nasca-assets-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

main().catch(err => {
  console.error('❌ Error en pipeline maestro:', err);
  process.exit(1);
});
