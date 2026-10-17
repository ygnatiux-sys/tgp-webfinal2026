import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = 'C:/Users/ygnat/tgp-remotion-engine-local';
const SRC_DIR = path.join(TARGET_DIR, 'src');

if (!fs.existsSync(SRC_DIR)) {
  fs.mkdirSync(SRC_DIR, { recursive: true });
}

// 1. package.json
const pkg = {
  name: "remotion-engine-cloudrun",
  version: "2.0.0",
  private: true,
  description: "TGP Autonomous 16:9 Cinematic Loop Render Engine with Remotion + Cloudflare R2",
  main: "server.js",
  scripts: {
    start: "node server.js"
  },
  dependencies: {
    "@aws-sdk/client-s3": "^3.750.0",
    "@remotion/bundler": "4.0.508",
    "@remotion/cli": "4.0.508",
    "@remotion/renderer": "4.0.508",
    "@remotion/transitions": "4.0.508",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "remotion": "4.0.508",
    "zod": "4.4.3"
  }
};
fs.writeFileSync(path.join(TARGET_DIR, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

// 2. Dockerfile
const docker = [
  'FROM node:20-bookworm-slim',
  '',
  '# Install Chromium, FFmpeg and fonts',
  'RUN apt-get update && apt-get install -y --no-install-recommends \\',
  '    chromium \\',
  '    ffmpeg \\',
  '    fonts-noto-cjk \\',
  '    fonts-liberation \\',
  '    fonts-freefont-ttf \\',
  '    fontconfig \\',
  '    ca-certificates \\',
  '    && rm -rf /var/lib/apt/lists/*',
  '',
  'ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true',
  'ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium',
  'ENV NODE_ENV=production',
  '',
  'WORKDIR /app',
  '',
  'COPY package*.json ./',
  'RUN npm install --omit=dev',
  '',
  'COPY . .',
  '',
  'EXPOSE 8080',
  '',
  'CMD ["node", "server.js"]',
  ''
].join('\n');
fs.writeFileSync(path.join(TARGET_DIR, 'Dockerfile'), docker, 'utf8');

// 3. .dockerignore
fs.writeFileSync(path.join(TARGET_DIR, '.dockerignore'), 'node_modules\n.git\n.env\nscratch\n*.log\n', 'utf8');

// 4. Copy DarkAcademiaLoop16x9.tsx from tgp-REMOTION
const sourceDark = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION/src/DarkAcademiaLoop16x9.tsx';
if (fs.existsSync(sourceDark)) {
  fs.copyFileSync(sourceDark, path.join(SRC_DIR, 'DarkAcademiaLoop16x9.tsx'));
}

// 5. Root.tsx
const rootContent = [
  "import React from 'react';",
  "import { Composition } from 'remotion';",
  "import { DarkAcademiaCinematicLoop16x9, darkAcademiaLoopSchema } from './DarkAcademiaLoop16x9';",
  "",
  "export const RemotionRoot: React.FC = () => {",
  "  return (",
  "    <>",
  "      <Composition",
  "        id='dark-academia-loop-16x9'",
  "        component={DarkAcademiaCinematicLoop16x9}",
  "        durationInFrames={300}",
  "        fps={30}",
  "        width={1920}",
  "        height={1080}",
  "        schema={darkAcademiaLoopSchema}",
  "        defaultProps={{",
  "          imageUrls: [",
  "            'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp'",
  "          ],",
  "          duracionPorEscena: 90,",
  "          duracionTransicion: 20",
  "        }}",
  "      />",
  "    </>",
  "  );",
  "};",
  ""
].join('\n');
fs.writeFileSync(path.join(SRC_DIR, 'Root.tsx'), rootContent, 'utf8');

// 6. index.ts
fs.writeFileSync(path.join(SRC_DIR, 'index.ts'), "import { registerRoot } from 'remotion';\nimport { RemotionRoot } from './Root';\nregisterRoot(RemotionRoot);\n", 'utf8');

console.log('✅ Archivos base listos en tgp-remotion-engine-local');
