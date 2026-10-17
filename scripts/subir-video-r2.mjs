import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');

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
const VAULT_FILE_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';
const MP4_FILE = path.join(ROOT_DIR, 'scratch', 'nan-madol-loop', 'nan-madol-hero-16x9.mp4');

async function uploadVideo() {
  if (!fs.existsSync(MP4_FILE)) {
    console.error('❌ No se encontró el archivo MP4:', MP4_FILE);
    process.exit(1);
  }

  const stats = fs.statSync(MP4_FILE);
  console.log(`⚡ Subiendo nan-madol-hero-16x9.mp4 (${(stats.size / 1024 / 1024).toFixed(2)} MB) a Cloudflare R2...`);

  const fileBuffer = fs.readFileSync(MP4_FILE);
  const blob = new Blob([fileBuffer], { type: 'video/mp4' });

  const fd = new FormData();
  fd.append('file', blob, 'nan-madol-hero-16x9.mp4');
  fd.append('category', 'cinematic-loops');
  fd.append('slug', 'nan-madol-el-enigma-megalitico');

  try {
    const res = await fetch(VAULT_FILE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIN}`
      },
      body: fd
    });

    console.log(`Status HTTP: ${res.status}`);
    const text = await res.text();
    console.log('Respuesta del servidor:\n', text);

    try {
      const data = JSON.parse(text);
      const r2Url = data.data?.media?.publicUrl || data.url || data.publicUrl;
      if (r2Url) {
        console.log(`\n🎉 ¡VIDEO SUBIDO A R2 CON ÉXITO ABSOLUTO!`);
        console.log(`URL PÚBLICA R2: ${r2Url}`);
      }
    } catch (_) {}
  } catch (err) {
    console.error('❌ Error de conexión:', err);
  }
}

uploadVideo();
