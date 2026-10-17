import fs from 'node:fs';
import { execSync } from 'node:child_process';

const envContent = fs.readFileSync('C:/Users/ygnat/TGP-Vault-Run/.env', 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
}

let localPin = process.env.VAULT_PIN;
if (!localPin && fs.existsSync('.env')) {
  const localEnv = fs.readFileSync('.env', 'utf8');
  const m = localEnv.match(/VAULT_PIN\s*=\s*(.*)/);
  if (m) localPin = m[1].trim().replace(/^['"]|['"]$/g, '');
}

const vaultPin = localPin || env.VAULT_PIN || '';

const envVars = [
  ...(vaultPin ? [`VAULT_PIN=${vaultPin}`] : []),
  `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`,
  `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`,
  `R2_BUCKET_NAME=${env.R2_BUCKET_NAME || 'tgp-storage'}`,
  `R2_PUBLIC_DOMAIN=${env.R2_PUBLIC_DOMAIN || 'storage.thegreatpuzzleproject.com'}`,
  `CLOUDFLARE_ACCOUNT_ID=${env.CLOUDFLARE_ACCOUNT_ID}`,
  `R2_ACCESS_KEY_ID=${env.R2_ACCESS_KEY_ID}`,
  `R2_SECRET_ACCESS_KEY=${env.R2_SECRET_ACCESS_KEY}`
].join(',');

const cmd = `gcloud run deploy remotion-engine ` +
  `--image us-central1-docker.pkg.dev/tgp-mind/tgp-video-repo/remotion-engine:v2 ` +
  `--region us-central1 ` +
  `--project tgp-mind ` +
  `--memory 4Gi ` +
  `--cpu 2 ` +
  `--timeout 300 ` +
  `--concurrency 10 ` +
  `--set-env-vars "${envVars}" ` +
  `--allow-unauthenticated ` +
  `--quiet`;

console.log('⚡ Desplegando remotion-engine v2 en Cloud Run...');
try {
  const out = execSync(cmd, { encoding: 'utf8' });
  console.log(out);
  console.log('🎉 Despliegue de remotion-engine v2 completado con éxito!');
} catch (err) {
  console.error('❌ Error desplegando:', err.stdout || err.message);
  process.exit(1);
}
