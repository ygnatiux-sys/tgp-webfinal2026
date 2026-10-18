import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'scratch', 'nasca-loop');

const vaultEnvPath = 'C:/Users/ygnat/TGP-Vault-Run/.env';
const vaultEnv = {};
if (fs.existsSync(vaultEnvPath)) {
  const content = fs.readFileSync(vaultEnvPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) vaultEnv[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
  }
}

const CLOUDFLARE_ACCOUNT_ID = vaultEnv.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = vaultEnv.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = vaultEnv.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = vaultEnv.R2_BUCKET_NAME || 'tgp-storage';
const R2_PUBLIC_DOMAIN = (vaultEnv.R2_PUBLIC_DOMAIN || 'storage.thegreatpuzzleproject.com').replace(/^https?:\/\//, '');

const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION';
const { S3Client, PutObjectCommand } = require(`${REMOTION_DIR}/node_modules/@aws-sdk/client-s3`);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

async function uploadBufferToR2(buffer, key, contentType = 'image/jpeg') {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  return `https://${R2_PUBLIC_DOMAIN}/${key}`;
}

async function main() {
  console.log('⚡ Extrayendo 8 imágenes históricas de Wikimedia Commons para Magazine...');
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent('Líneas de Nazca filetype:bitmap')}&srnamespace=6&srlimit=12`;
  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
  });
  const data = await res.json();
  const titles = (data.query?.search || []).map(s => s.title);

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
      mime: p.imageinfo?.[0]?.mime,
      width: p.imageinfo?.[0]?.width || 0,
      height: p.imageinfo?.[0]?.height || 0
    }))
    .filter(img => img.url && (img.mime?.startsWith('image/') || img.url.includes('.jpg') || img.url.includes('.png') || img.url.includes('.jpeg') || img.url.includes('.JPG')))
    .slice(0, 8);

  const wikiBatch = [];
  for (let i = 0; i < validImages.length; i++) {
    const item = validImages[i];
    console.log(`⬇️ Descargando (${i + 1}/8): ${item.title}`);
    const imgRes = await fetch(item.url, {
      headers: { 'User-Agent': 'TGP-Research-Bot/1.0 (contact@thegreatpuzzleproject.com)' }
    });
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = 'jpg';
    const key = `vault-media/nasca/wiki-batch-${String(i + 1).padStart(2, '0')}.${ext}`;
    const r2Url = await uploadBufferToR2(buffer, key, 'image/jpeg');
    console.log(`   ✅ R2: ${r2Url}`);
    wikiBatch.push({ title: item.title, url: r2Url });
  }

  // Actualizar manifest
  const manifestPath = path.join(OUTPUT_DIR, 'nasca-assets-manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  manifest.wikiBatch = wikiBatch;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\n🎉 8 Imágenes de Wikimedia transmutadas a R2 y guardadas en manifest!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
