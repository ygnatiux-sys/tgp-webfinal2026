import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const OUTPUT_DIR = path.join(ROOT_DIR, 'scratch', 'derinkuyu-loop');

// 1. Cargar variables de entorno
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
const VAULT_UPLOAD_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';

const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION';
const { bundle } = require(`${REMOTION_DIR}/node_modules/@remotion/bundler`);
const { renderMedia, selectComposition } = require(`${REMOTION_DIR}/node_modules/@remotion/renderer`);
const { S3Client, PutObjectCommand } = require(`${REMOTION_DIR}/node_modules/@aws-sdk/client-s3`);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 2. Definición Curatorial de los 4 Planos Cinematográficos (Derinkuyu, Capadocia)
const PLANOS_DERINKUYU = [
  {
    num: 1,
    id: 'frame-01',
    titulo: 'El Laberinto de Toba Volcánica (Nivel 2)',
    desc: 'Underground corridors of Derinkuyu carved into pale volcanic tuff rock. Narrow arched tunnel with ancient soot marks in oil lamp niches. Chiaroscuro lighting with warm candle-like glow cutting through airborne dust particles. Claustrophobic atmospheric perspective, cinematic 16:9 widescreen, National Geographic archaeology photography style, no tourists, pristine historical atmosphere.'
  },
  {
    num: 2,
    id: 'frame-02',
    titulo: 'La Puerta Rodante de Molino (Tirhaz)',
    desc: 'Colossal circular stone millstone door sealing an ancient subterranean passageway in Derinkuyu. 1.5-meter diameter carved limestone rolling wheel nestled in its carved groove with central hole for lever. Rough porous rock texture, dramatic side rim light revealing the chisel marks, 16:9 cinematic shot on 35mm film, master archeology documentary framing.'
  },
  {
    num: 3,
    id: 'frame-03',
    titulo: 'El Pozo de Ventilación Abismal (55m)',
    desc: 'Steep downward angle looking into the monumental vertical ventilation shaft of Derinkuyu plunging 55 meters into the deep earth. Natural sunlight beams filtering from the surface, illuminating carved foothold steps down the cylindrical volcanic rock shaft. Sublime scale of subterranean engineering, 16:9 Tarkovsky framing, dark academia aesthetic.'
  },
  {
    num: 4,
    id: 'frame-04',
    titulo: 'La Basílica Subterránea Cruciforme (Nivel 7)',
    desc: 'Monumental rock-cut cruciform church deep in level 7 of Derinkuyu underground city. Barrel-vaulted ceilings carved directly into soft volcanic rock, massive monolith columns, ritual niches in the walls. Solemn silence, warm flickering torchlight and subtle blue shadows, seamless closure for a continuous ambient loop, 16:9 master cinematography.'
  }
];

async function forjarYSubirPlano(plano) {
  console.log(`\n──────────────────────────────────────────────────────────────────────`);
  console.log(`📸 [Plano ${plano.num}/4] ${plano.titulo}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${GEMINI_KEY}`;
  const promptFinal = `Cinematic documentary 16:9 widescreen frame. ${plano.desc} Shot on 35mm film, master cinematography, natural atmospheric lighting, rich stone texture, dark academia aesthetic, photorealistic, 8k resolution, no text, no modern elements.`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }] })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Fallo en Gemini Image API (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error(`Respuesta sin inlineData para plano ${plano.num}`);
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const localFilePath = path.join(OUTPUT_DIR, `${plano.id}.jpg`);
  fs.writeFileSync(localFilePath, imageBuffer);

  // Subir a Cloudflare R2 vía tgp-vault-run
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), `derinkuyu-${plano.id}-${Date.now()}.jpg`);
  formData.append('title', `Derinkuyu Loop 16:9 · ${plano.titulo}`);
  formData.append('topic', 'Derinkuyu Subterránea Loop');

  const vaultRes = await fetch(VAULT_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PIN}` },
    body: formData
  });

  if (!vaultRes.ok) {
    throw new Error(`Error subiendo a R2: ${vaultRes.status}`);
  }

  const vaultResult = await vaultRes.json();
  const r2Url = vaultResult.data?.media?.publicUrl || vaultResult.url;
  console.log(`   ✅ R2 INMUTABLE: ${r2Url}`);

  return {
    num: plano.num,
    id: plano.id,
    titulo: plano.titulo,
    r2Url,
    localFile: localFilePath
  };
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  ⚡ TEST DE FORJA DE LOOP 10S: DERINKUYU (CAPADOCIA, TURQUÍA)        ║');
  console.log('║     Gemini Flash Image (4 Planos) ➔ R2 ➔ Remotion 10s ➔ R2 Video    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const fotogramas = [];
  for (const plano of PLANOS_DERINKUYU) {
    const r = await forjarYSubirPlano(plano);
    fotogramas.push(r);
    await new Promise(res => setTimeout(res, 1200));
  }

  const imageUrls = fotogramas.map(f => f.r2Url);
  console.log('\n✅ 4 Fotogramas sintéticos asegurados en Cloudflare R2:');
  imageUrls.forEach((u, i) => console.log(`   ${i + 1}. ${u}`));

  // RENDERIZAR CON REMOTION
  console.log('\n⚡ [Fase 2/3] Empaquetando y Renderizando Loop 10s con Remotion...');
  const bundleLocation = await bundle({
    entryPoint: `${REMOTION_DIR}/src/index.ts`,
  });

  const inputProps = {
    imageUrls,
    duracionPorEscena: 90,
    duracionTransicion: 20
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'dark-academia-loop-16x9',
    inputProps,
  });

  const localMp4 = path.join(OUTPUT_DIR, 'derinkuyu-hero-16x9.mp4');

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
  console.log(`\n🎉 [Fase 3/3] Video MP4 renderizado localmente (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  // SUBIR VIDEO MP4 DIRECTO A R2
  console.log('⚡ Transmitiendo master video a Cloudflare R2...');
  const envContent = fs.readFileSync('C:/Users/ygnat/TGP-Vault-Run/.env', 'utf8');
  const env = {};
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
  }

  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    }
  });

  const r2Key = 'vault-media/loops/derinkuyu/derinkuyu-hero-16x9.mp4';
  await r2Client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME || 'tgp-storage',
    Key: r2Key,
    Body: fs.readFileSync(localMp4),
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=31536000, immutable'
  }));

  const cleanDomain = (env.R2_PUBLIC_DOMAIN || 'storage.thegreatpuzzleproject.com').replace(/^https?:\/\//, '');
  const videoPublicUrl = `https://${cleanDomain}/${r2Key}`;

  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`🎉 ¡LOOP 10S DERINKUYU PUBLICADO CON ÉXITO!`);
  console.log(`   URL R2: ${videoPublicUrl}`);
  console.log(`   Duración: 10.0s (300 fotogramas @ 30fps)`);
  console.log(`   Resolución: 1920x1080 (16:9)`);
  console.log(`   Peso: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`══════════════════════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
