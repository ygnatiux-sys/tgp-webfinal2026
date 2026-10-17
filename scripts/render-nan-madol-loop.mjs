import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION';
const { bundle } = require(`${REMOTION_DIR}/node_modules/@remotion/bundler`);
const { renderMedia, selectComposition } = require(`${REMOTION_DIR}/node_modules/@remotion/renderer`);

const OUTPUT_DIR = path.resolve(__dirname, '../scratch/nan-madol-loop');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'nan-madol-hero-16x9.mp4');

const FRAMES = [
  {
    id: 'sc_1',
    durationInFrames: 45,
    imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp',
    cameraPan: 'Slow reveal cenital',
    narrativeText: 'Nan Madol · Enigma Megalítico Marino'
  },
  {
    id: 'sc_2',
    durationInFrames: 45,
    imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792217505902-206dbd92.webp',
    cameraPan: 'Ascenso columnar basalto',
    narrativeText: 'El Recinto Ciclópeo de Nan Douwas'
  },
  {
    id: 'sc_3',
    durationInFrames: 45,
    imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792217519518-b5ba057e.webp',
    cameraPan: 'Umbral sagrado cripta',
    narrativeText: 'La Tumba Real y los Canales Silenciosos'
  },
  {
    id: 'sc_4',
    durationInFrames: 45,
    imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792217532545-045e2f7b.webp',
    cameraPan: 'Muralla contra el arrecife',
    narrativeText: 'Flotando sobre el Océano Pacífico'
  }
];

async function run() {
  console.log('⚡ [1/4] Empaquetando Remotion Root...');
  const bundleLocation = await bundle({
    entryPoint: `${REMOTION_DIR}/src/index.ts`,
  });
  console.log('✅ Bundle listo en:', bundleLocation);

  const inputProps = {
    imageUrls: [
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217505902-206dbd92.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217519518-b5ba057e.webp',
      'https://storage.thegreatpuzzleproject.com/vault-media/1792217532545-045e2f7b.webp'
    ],
    duracionPorEscena: 90,
    duracionTransicion: 20
  };

  console.log('⚡ [2/4] Seleccionando composición 16:9 (dark-academia-loop-16x9)...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'dark-academia-loop-16x9',
    inputProps,
  });

  console.log(`✅ Composición configurada: ${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames (~${(composition.durationInFrames / composition.fps).toFixed(1)}s)`);

  console.log('⚡ [3/4] Renderizando loop MP4 Dark Academia (10s = 300 frames @ 30fps, crf: 28)...');
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    crf: 28,
    outputLocation: OUTPUT_FILE,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 20 === 0) {
        console.log(`   🎬 Progreso de render: ${pct}%`);
      }
    }
  });

  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`\n🎉 [4/4] ¡VIDEO MP4 RENDERIZADO CON ÉXITO!`);
  console.log(`   Ruta local: ${OUTPUT_FILE}`);
  console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

run().catch(err => {
  console.error('❌ Error renderizando Remotion:', err);
  process.exit(1);
});
