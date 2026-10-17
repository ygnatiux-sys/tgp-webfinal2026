import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION';
const { S3Client, PutObjectCommand } = require(`${REMOTION_DIR}/node_modules/@aws-sdk/client-s3`);

const VAULT_ENV_FILE = 'C:/Users/ygnat/TGP-Vault-Run/.env';
if (!fs.existsSync(VAULT_ENV_FILE)) {
  console.error('❌ No se encontró .env de Vault:', VAULT_ENV_FILE);
  process.exit(1);
}

const envContent = fs.readFileSync(VAULT_ENV_FILE, 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
}

const MP4_FILE = path.resolve(__dirname, '../scratch/nan-madol-loop/nan-madol-hero-16x9.mp4');
if (!fs.existsSync(MP4_FILE)) {
  console.error('❌ No se encontró el archivo MP4 local:', MP4_FILE);
  process.exit(1);
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

async function main() {
  const stats = fs.statSync(MP4_FILE);
  const fileStream = fs.createReadStream(MP4_FILE);
  const key = 'vault-media/loops/nan-madol/nan-madol-hero-16x9.mp4';

  console.log(`⚡ Subiendo directamente a Cloudflare R2 bucket: ${env.R2_BUCKET_NAME}`);
  console.log(`   Key: ${key}`);
  console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: fs.readFileSync(MP4_FILE),
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=31536000, immutable'
  });

  await r2Client.send(command);

  const publicDomain = env.R2_PUBLIC_DOMAIN || 'storage.thegreatpuzzleproject.com';
  const publicUrl = `https://${publicDomain}/${key}`;

  console.log(`\n🎉 ¡VIDEO MP4 INMUTABLE EN CLOUDFLARE R2!`);
  console.log(`   URL PÚBLICA: ${publicUrl}`);

  // Guardar en manifest
  const manifestPath = path.resolve(__dirname, '../scratch/nan-madol-loop/manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.videoMp4Url = publicUrl;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }
}

main().catch(err => {
  console.error('❌ Error subiendo a R2:', err);
  process.exit(1);
});
