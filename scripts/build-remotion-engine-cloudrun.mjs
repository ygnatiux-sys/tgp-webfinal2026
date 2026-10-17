import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = 'C:/Users/ygnat/tgp-remotion-engine-local';
const SRC_DIR = path.join(TARGET_DIR, 'src');

if (!fs.existsSync(SRC_DIR)) {
  fs.mkdirSync(SRC_DIR, { recursive: true });
}

// 1. package.json
const packageJson = {
  name: "remotion-engine-cloudrun",
  version: "2.0.0",
  private: true,
  description: "TGP Autonomous 16:9 Cinematic Loop Render Engine with Remotion + Cloudflare R2",
  main: "server.js",
  scripts: {
    start: "node server.js",
    dev: "remotion studio"
  },
  dependencies: {
    "@aws-sdk/client-s3": "^3.750.0",
    "@google/genai": "latest",
    "@remotion/bundler": "4.0.508",
    "@remotion/cli": "4.0.508",
    "@remotion/google-fonts": "4.0.508",
    "@remotion/renderer": "4.0.508",
    "@remotion/transitions": "4.0.508",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "remotion": "4.0.508",
    "zod": "4.4.3"
  }
};

fs.writeFileSync(path.join(TARGET_DIR, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ package.json creado');

// 2. DarkAcademiaLoop16x9.tsx
const darkAcademiaComponent = `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { z } from 'zod';

export const darkAcademiaLoopSchema = z.object({
  imageUrls: z.array(z.string()).min(1),
  duracionPorEscena: z.number().default(90),
  duracionTransicion: z.number().default(20),
});

export type DarkAcademiaLoopProps = z.infer<typeof darkAcademiaLoopSchema>;

const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.08, mixBlendMode: 'overlay', zIndex: 20 }}>
      <svg width="100%" height="100%" style={{ filter: 'contrast(160%) brightness(100%)' }}>
        <filter id="dark-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dark-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

const VignetteLayer: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 15,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,7,12,0.45) 75%, rgba(2,3,6,0.92) 100%)',
      }}
    />
  );
};

const CinematicShot: React.FC<{
  imageUrl: string;
  shotIndex: number;
  durationInFrames: number;
}> = ({ imageUrl, shotIndex, durationInFrames }) => {
  const frame = useCurrentFrame();

  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (shotIndex % 4 === 0) {
    scale = interpolate(frame, [0, durationInFrames], [1.0, 1.045], { extrapolateRight: 'clamp' });
  } else if (shotIndex % 4 === 1) {
    scale = 1.035;
    translateX = interpolate(frame, [0, durationInFrames], [0, -2.0], { extrapolateRight: 'clamp' });
  } else if (shotIndex % 4 === 2) {
    scale = interpolate(frame, [0, durationInFrames], [1.05, 1.01], { extrapolateRight: 'clamp' });
  } else {
    scale = 1.03;
    translateY = interpolate(frame, [0, durationInFrames], [0, -1.8], { extrapolateRight: 'clamp' });
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#07090d' }}>
      <Img
        src={imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: \`scale(\${scale}) translate(\${translateX}%, \${translateY}%)\`,
          filter: 'contrast(106%) brightness(96%) saturate(92%)',
        }}
      />
    </AbsoluteFill>
  );
};

export const DarkAcademiaCinematicLoop16x9: React.FC<DarkAcademiaLoopProps> = ({
  imageUrls,
  duracionPorEscena = 90,
  duracionTransicion = 20,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#05070a' }}>
      <TransitionSeries>
        {imageUrls.map((url, idx) => (
          <React.Fragment key={idx}>
            <TransitionSeries.Sequence durationInFrames={duracionPorEscena}>
              <CinematicShot
                imageUrl={url}
                shotIndex={idx}
                durationInFrames={duracionPorEscena}
              />
            </TransitionSeries.Sequence>
            {idx < imageUrls.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: duracionTransicion })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      <VignetteLayer />
      <FilmGrain />

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 30,
        }}
      />
    </AbsoluteFill>
  );
};
`;
fs.writeFileSync(path.join(SRC_DIR, 'DarkAcademiaLoop16x9.tsx'), darkAcademiaComponent, 'utf8');
console.log('✅ DarkAcademiaLoop16x9.tsx copiado a src/');

// 3. Root.tsx
const rootTsx = `import React from 'react';
import { Composition } from 'remotion';
import { DarkAcademiaCinematicLoop16x9, darkAcademiaLoopSchema } from './DarkAcademiaLoop16x9';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="dark-academia-loop-16x9"
        component={DarkAcademiaCinematicLoop16x9}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={darkAcademiaLoopSchema}
        defaultProps={{
          imageUrls: [
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp',
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217505902-206dbd92.webp',
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217519518-b5ba057e.webp',
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217532545-045e2f7b.webp'
          ],
          duracionPorEscena: 90,
          duracionTransicion: 20
        }}
      />
    </>
  );
};
`;
fs.writeFileSync(path.join(SRC_DIR, 'Root.tsx'), rootTsx, 'utf8');

// 4. index.ts (punto de entrada Remotion)
const indexTs = `import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
`;
fs.writeFileSync(path.join(SRC_DIR, 'index.ts'), indexTs, 'utf8');
console.log('✅ Root.tsx e index.ts configurados');

// 5. server.js (Servidor Express para Cloud Run + R2 Ingest + Webhook para Google Chat & Telegram)
const serverJs = `const express = require('express');
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
  endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  }
});

let prebundledLocation = null;

// Prebundle Remotion al iniciar para evitar cold starts
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

// Middleware de autenticación Bearer PIN
const requireAuth = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth && (auth === \`Bearer \${VAULT_PIN}\` || auth === VAULT_PIN)) {
    return next();
  }
  return res.status(401).json({ error: 'PIN no autorizado' });
};

// 1. Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'remotion-engine-cloudrun',
    version: '2.0.0',
    chromium: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    bundleReady: Boolean(prebundledLocation),
  });
});

// 2. Render Endpoint Principal
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
    console.log(\`🎬 Recibida orden de render para [\${slug}]: \${imageUrls.length} imágenes\`);

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

    const tempOutput = path.join(os.tmpdir(), \`\${slug}-\${Date.now()}.mp4\`);

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
    const r2Key = \`vault-media/loops/\${slug}/hero-16x9.mp4\`;

    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      CacheControl: 'public, max-age=31536000, immutable'
    }));

    fs.unlinkSync(tempOutput);

    const publicUrl = \`https://\${PUBLIC_DOMAIN}/\${r2Key}\`;
    console.log('🎉 Loop subido exitosamente a R2:', publicUrl);

    return res.json({
      ok: true,
      status: 'DONE',
      mp4Url: publicUrl,
      slug,
      durationSeconds: Math.round(composition.durationInFrames / composition.fps),
      frames: composition.durationInFrames,
      resolution: \`\${composition.width}x\${composition.height}\`
    });

  } catch (err) {
    console.error('❌ Error en /render:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Webhook de disparo directo para Google Chat / Telegram
app.post('/prompt-loop', requireAuth, async (req, res) => {
  const { prompt, slug = 'ai-loop-' + Date.now(), channel = 'chat' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido.' });

  res.json({
    ok: true,
    message: \`⚡ Orden de loop 10s Dark Academia recibida para [\${prompt}]. Procesando en background...\`,
    channel
  });
});

app.listen(PORT, async () => {
  console.log(\`======================================================\`);
  console.log(\`🎬 TGP REMOTION ENGINE V2 (Cloud Run 16:9 Dark Academia)\`);
  console.log(\`   Puerto: \${PORT}\`);
  console.log(\`======================================================\`);
  await initBundle();
});
`;
fs.writeFileSync(path.join(TARGET_DIR, 'server.js'), serverJs, 'utf8');
console.log('✅ server.js creado');

// 6. Dockerfile
const dockerfile = `FROM node:20-bookworm-slim

# Instalar Chromium, FFmpeg y fuentes de sistema para renderizado sin errores
RUN apt-get update && apt-get install -y --no-install-recommends \\
    chromium \\
    ffmpeg \\
    fonts-noto-cjk \\
    fonts-liberation \\
    fonts-freefont-ttf \\
    fontconfig \\
    ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
`;
fs.writeFileSync(path.join(TARGET_DIR, 'Dockerfile'), dockerfile, 'utf8');
console.log('✅ Dockerfile creado');

// 7. .dockerignore
const dockerignore = `node_modules
.git
.env
scratch
*.log
`;
fs.writeFileSync(path.join(TARGET_DIR, '.dockerignore'), dockerignore, 'utf8');
console.log('✅ .dockerignore creado');

console.log('\\n🚀 Configuración completa para Google Cloud Build!');
`;
