import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = 'C:/Users/ygnat/tgp-remotion-engine-local';

const serverCode = `const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));

const PORT = process.env.PORT || 8080;
const VAULT_PIN = (process.env.VAULT_PIN || '2771').trim();
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tgp-storage';
const PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || 'storage.thegreatpuzzleproject.com').replace(/^https?:\\/\\//, '');

// R2 S3 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: "https://" + (process.env.CLOUDFLARE_ACCOUNT_ID || 'c387ad62fb91e0a9ce02b0c4ebba89c0') + ".r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  }
});

let prebundledLocation = null;

async function initBundle() {
  try {
    console.log('⚡ Pre-empaquetando Remotion Root para renders instantáneos...');
    prebundledLocation = await bundle({
      entryPoint: path.join(__dirname, 'src/index.ts'),
    });
    console.log('✅ Bundle listo en:', prebundledLocation);
  } catch (err) {
    console.error('⚠️ Advertencia en pre-bundle:', err.message);
  }
}

const requireAuth = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth && (auth === 'Bearer ' + VAULT_PIN || auth === VAULT_PIN)) {
    return next();
  }
  return res.status(401).json({ error: 'PIN no autorizado' });
};

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'remotion-engine-cloudrun',
    version: '2.0.0',
    chromium: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    bundleReady: Boolean(prebundledLocation),
  });
});

app.post('/render', requireAuth, async (req, res) => {
  const {
    imageUrls = [],
    slug = 'loop-' + Date.now(),
    title = 'Ensayo Cinemático TGP',
    duracionPorEscena = 90,
    duracionTransicion = 20,
    crf = 28
  } = req.body;

  if (!imageUrls.length) {
    return res.status(400).json({ error: 'Se requiere array imageUrls con al menos 1 URL de imagen.' });
  }

  try {
    console.log('🎬 Recibida orden de render para [' + slug + ']: ' + imageUrls.length + ' imágenes');

    const serveUrl = prebundledLocation || await bundle({
      entryPoint: path.join(__dirname, 'src/index.ts'),
    });

    const inputProps = {
      imageUrls,
      duracionPorEscena: Number(duracionPorEscena) || 90,
      duracionTransicion: Number(duracionTransicion) || 20,
    };

    const composition = await selectComposition({
      serveUrl,
      id: 'dark-academia-loop-16x9',
      inputProps,
    });

    const tempOutput = path.join(os.tmpdir(), slug + '-' + Date.now() + '.mp4');

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      pixelFormat: 'yuv420p',
      crf: Number(crf) || 28,
      outputLocation: tempOutput,
      inputProps,
      chromiumOptions: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      }
    });

    console.log('✅ Render completado localmente. Subiendo a Cloudflare R2...');

    const fileBuffer = fs.readFileSync(tempOutput);
    const r2Key = 'vault-media/loops/' + slug + '/hero-16x9.mp4';

    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      CacheControl: 'public, max-age=31536000, immutable'
    }));

    fs.unlinkSync(tempOutput);

    const publicUrl = 'https://' + PUBLIC_DOMAIN + '/' + r2Key;
    console.log('🎉 Loop subido exitosamente a R2:', publicUrl);

    return res.json({
      ok: true,
      status: 'DONE',
      mp4Url: publicUrl,
      slug,
      durationSeconds: Math.round(composition.durationInFrames / composition.fps),
      frames: composition.durationInFrames,
      resolution: composition.width + 'x' + composition.height
    });

  } catch (err) {
    console.error('❌ Error en /render:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/prompt-loop', requireAuth, async (req, res) => {
  const { prompt, slug = 'ai-loop-' + Date.now(), channel = 'chat' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido.' });

  res.json({
    ok: true,
    message: '⚡ Orden de loop 10s Dark Academia recibida para [' + prompt + '].',
    channel
  });
});

app.listen(PORT, async () => {
  console.log('======================================================');
  console.log('🎬 TGP REMOTION ENGINE V2 (Cloud Run 16:9 Dark Academia)');
  console.log('   Puerto: ' + PORT);
  console.log('======================================================');
  await initBundle();
});
`;

fs.writeFileSync(path.join(TARGET_DIR, 'server.js'), serverCode, 'utf8');
console.log('✅ server.js escrito con éxito en', TARGET_DIR);
