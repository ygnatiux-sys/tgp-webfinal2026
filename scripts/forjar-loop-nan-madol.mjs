import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const OUTPUT_DIR = path.join(ROOT_DIR, 'scratch', 'nan-madol-loop');

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

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  🗿 ETAPA 1: FORJA DE 4 FOTOGRAMAS 16:9 SINTÉTICOS + SUBIDA A R2    ║');
console.log('║     Caso Piloto: Nan Madol (Micronesia) · Gemini Flash Image         ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

if (!GEMINI_KEY) {
  console.error('❌ [ERROR] Falta GEMINI_API_KEY en .env');
  process.exit(1);
}

// 2. Definición del Guion de 4 Planos Cinematográficos (16:9, Tarkovsky/Pasolini Style)
const PLANOS_NAN_MADOL = [
  {
    num: 1,
    id: 'frame-01',
    plano: 'Plano General Cenital / Atmosférico',
    desc: 'Vista aérea de los islotes artificiales de Nan Madol rodeados por el océano Pacífico y arrecifes de coral al amanecer. Columnas prismáticas de basalto negro sumergidas en canales turquesa con niebla costera. Estilo cinematográfico 16:9, iluminación dorada baja, realismo arqueológico extremo, sin turistas.',
    tiempo: '0.0s - 1.0s (Entrada de niebla)'
  },
  {
    num: 2,
    id: 'frame-02',
    plano: 'Plano Medio / Arquitectura Ciclópea',
    desc: 'Muro monumental de basalto columnar en el recinto ceremonial de Nan Douwas. Troncos de roca volcánica apilados en cruz con precisión ciclópea. Líquenes tropicales, vegetación húmeda de la selva de Pohnpei abrazando la piedra oscura. Formato 16:9 cinematográfico, textura táctil de roca milenaria, óptica anamórfica 35mm.',
    tiempo: '1.0s - 2.0s (Detalle de cantería)'
  },
  {
    num: 3,
    id: 'frame-03',
    plano: 'Plano Inmersivo / La Puerta de Entrada a la Cripta',
    desc: 'Perspectiva a nivel del suelo frente al umbral colosal de la tumba real de Nan Douwas. Rayos de sol tropical penetrando entre las junturas de las vigas basálticas. Arena marina y canales con reflejos de agua en reposo. Composición 16:9 simétrica, atmósfera de silencio sagrado y solemnidad Tarkovskiana.',
    tiempo: '2.0s - 3.0s (El umbral sagrado)'
  },
  {
    num: 4,
    id: 'frame-04',
    plano: 'Plano de Clausura / La Muralla contra el Océano',
    desc: 'La muralla exterior de Nan Madol resistiendo el embate de las olas del arrecife. Rocas de basalto negro húmedas brillando bajo la luz crepuscular, empalmando suavemente con la paleta de color del amanecer del plano 1 para cierre de bucle perfecto. Cinematografía 16:9, composición monumental.',
    tiempo: '3.0s - 4.0s (Retorno al océano y loop)'
  }
];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 3. Generación y Subida Blindada a R2
async function forjarYSubirPlano(plano) {
  console.log(`\n──────────────────────────────────────────────────────────────────────`);
  console.log(`📸 [Plano ${plano.num}/4] ${plano.plano} (${plano.tiempo})`);
  console.log(`   Prompt: "${plano.desc.slice(0, 100)}..."`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${GEMINI_KEY}`;
  const promptFinal = `Cinematic documentary 16:9 widescreen frame. ${plano.desc} Shot on 35mm film, master cinematography, natural atmospheric lighting, rich stone texture, dark academia aesthetic, photorealistic, 8k resolution, no text, no modern elements.`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptFinal }] }]
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Fallo en Gemini Image API (Plano ${plano.num}, Status ${res.status}): ${errorText.slice(0, 250)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error(`La respuesta de Gemini no incluye inlineData para el plano ${plano.num}.`);
  }

  console.log(`   ✓ Imagen sintética recibida (${imagePart.inlineData.mimeType}, ${imagePart.inlineData.data.length} bytes base64)`);
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  // Guardar localmente en scratch como resguardo adicional
  const localFilePath = path.join(OUTPUT_DIR, `${plano.id}.jpg`);
  fs.writeFileSync(localFilePath, imageBuffer);
  console.log(`   💾 Copia local de seguridad: ${localFilePath}`);

  // Subir directamente a Cloudflare R2 vía tgp-vault-run
  console.log(`   ⚡ Transmitiendo a Cloudflare R2 (/vault-media/loops/nan-madol/)...`);
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), `nan-madol-${plano.id}-${Date.now()}.jpg`);
  formData.append('title', `Nan Madol Loop 16:9 · ${plano.plano}`);
  formData.append('topic', 'Nan Madol Loop Cinemático');

  const vaultRes = await fetch(VAULT_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PIN}` },
    body: formData
  });

  if (!vaultRes.ok) {
    const vErr = await vaultRes.text();
    throw new Error(`Error subiendo a R2 en plano ${plano.num} (${vaultRes.status}): ${vErr}`);
  }

  const vaultResult = await vaultRes.json();
  const r2Url = vaultResult.data?.media?.publicUrl || vaultResult.url;
  console.log(`   ✅ R2 INMUTABLE PERSISTIDO:`);
  console.log(`      -> URL R2: ${r2Url}`);
  console.log(`      -> Formato: ${vaultResult.data?.media?.format || 'WebP'} (${vaultResult.data?.media?.width || 1280}x${vaultResult.data?.media?.height || 720})`);

  return {
    num: plano.num,
    id: plano.id,
    plano: plano.plano,
    tiempo: plano.tiempo,
    r2Url,
    localFile: localFilePath
  };
}

// 4. Ejecución del Ciclo Secuencial
async function main() {
  const manifest = {
    loopId: 'nan-madol-hero-16x9',
    tema: 'Nan Madol: El Enigma Megalítico',
    aspectRatio: '16:9',
    duracionSegundos: 4.0,
    fps: 24,
    fechaGeneracion: new Date().toISOString(),
    fotogramas: []
  };

  try {
    for (const plano of PLANOS_NAN_MADOL) {
      const resultado = await forjarYSubirPlano(plano);
      manifest.fotogramas.push(resultado);
      // Pausa leve de 1s para respetar cortesía de API
      await new Promise(r => setTimeout(r, 1000));
    }

    const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`\n══════════════════════════════════════════════════════════════════════`);
    console.log(`🎉 ¡ETAPA 1 COMPLETADA CON ÉXITO ABSOLUTO!`);
    console.log(`   4 fotogramas 16:9 sintetizados y blindados en Cloudflare R2.`);
    console.log(`   Manifiesto guardado en: ${manifestPath}`);
    console.log(`══════════════════════════════════════════════════════════════════════\n`);
  } catch (err) {
    console.error(`\n❌ Error en la ejecución:`, err.message);
    process.exit(1);
  }
}

main();
