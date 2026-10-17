import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BRAIN_DIR = 'C:/Users/ygnat/.gemini/antigravity-ide/brain';
const OUTPUT_DIR = path.resolve('scratch/corpus_tgp');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Iniciando extracción del Corpus de Memoria TGP (234 sesiones)...');

const dirs = fs.readdirSync(BRAIN_DIR);

let bufferDev = ['# TGP MEMORIA: ARQUITECTURA WEB, ASTRO, GSAP, REMOTION Y FRONTEND\n\n'];
let bufferEditorial = ['# TGP MEMORIA: EDITORIAL, ARQUEOLOGÍA ANÓMALA, MEGALITISMO Y FILOSOFÍA\n\n'];
let bufferDevOps = ['# TGP MEMORIA: DEVOPS, CLOUD RUN, DIALOGFLOW CX, R2 Y SOLUCIONES TÉCNICAS\n\n'];

let devCount = 0;
let editCount = 0;
let devopsCount = 0;

for (const d of dirs) {
  const p = path.join(BRAIN_DIR, d, '.system_generated/logs/transcript.jsonl');
  if (!fs.existsSync(p)) continue;

  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');

  let sessionTitle = `\n## Sesión: ${d}\n`;
  let hasDev = false;
  let hasEdit = false;
  let hasDevOps = false;

  let sessionDev = sessionTitle;
  let sessionEdit = sessionTitle;
  let sessionDevOps = sessionTitle;

  let lastUserText = '';

  for (const l of lines) {
    if (!l.trim()) continue;
    try {
      const obj = JSON.parse(l);

      if (obj.type === 'USER_INPUT' && obj.content) {
        let text = obj.content.trim();
        text = text.replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, '').trim();
        if (text.length > 5) {
          lastUserText = text;
        }
      } else if (obj.type === 'PLANNER_RESPONSE' && obj.content && lastUserText) {
        let reply = obj.content.trim();
        if (reply.length > 30) {
          const combined = `\n### Diálogo / Requerimiento:\n**Xavier:** ${lastUserText}\n\n**Antigravity (Respuesta y Solución):**\n${reply}\n\n---\n`;

          const isArqueologia = /\b(nan[ -]?madol|derinkuyu|capadocia|g[oö]bekli|megalit|pir[aá]mide|holoceno|borge|filosof|arqueo|cronolog[ií]a|arcaic|basalto)\b/i.test(lastUserText + ' ' + reply);
          const isDevOps = /\b(cloud run|docker|dockerfile|gcloud|dialogflow|webhook|secret|r2|s3|token|timeout|pin|endpoint|deploy)\b/i.test(lastUserText + ' ' + reply);

          if (isArqueologia) {
            sessionEdit += combined;
            hasEdit = true;
            editCount++;
          } else if (isDevOps) {
            sessionDevOps += combined;
            hasDevOps = true;
            devopsCount++;
          } else {
            sessionDev += combined;
            hasDev = true;
            devCount++;
          }

          lastUserText = '';
        }
      }
    } catch (e) {}
  }

  if (hasDev) bufferDev.push(sessionDev);
  if (hasEdit) bufferEditorial.push(sessionEdit);
  if (hasDevOps) bufferDevOps.push(sessionDevOps);
}

const fileDev = path.join(OUTPUT_DIR, '01_TGP_Arquitectura_Web_Dev_Patrones.md');
const fileEdit = path.join(OUTPUT_DIR, '02_TGP_Editorial_Arqueologia_Filosofia.md');
const fileDevOps = path.join(OUTPUT_DIR, '03_TGP_Soluciones_Bugs_y_DevOps.md');

fs.writeFileSync(fileDev, bufferDev.join(''), 'utf8');
fs.writeFileSync(fileEdit, bufferEditorial.join(''), 'utf8');
fs.writeFileSync(fileDevOps, bufferDevOps.join(''), 'utf8');

console.log('✅ Extracción completada:');
console.log(`   - Bloques Frontend / Arquitectura Web: ${devCount}`);
console.log(`   - Bloques Arqueología / Editorial TGP: ${editCount}`);
console.log(`   - Bloques DevOps / Cloud Run / Webhooks: ${devopsCount}`);

console.log('\n📦 Archivos generados en scratch/corpus_tgp:');
const files = [
  '01_TGP_Arquitectura_Web_Dev_Patrones.md',
  '02_TGP_Editorial_Arqueologia_Filosofia.md',
  '03_TGP_Soluciones_Bugs_y_DevOps.md'
];

for (const f of files) {
  const full = path.join(OUTPUT_DIR, f);
  const sizeMb = (fs.statSync(full).size / 1024 / 1024).toFixed(2);
  console.log(`   📄 ${f} (${sizeMb} MB)`);
}

// Subida a Google Cloud Storage
console.log('\n☁️ Subiendo corpus a Google Cloud Storage (gs://tgp-mind-memoria-iowa/corpus/)...');
try {
  const uploadCmd = `gcloud storage cp "${OUTPUT_DIR}/01_TGP_Arquitectura_Web_Dev_Patrones.md" "${OUTPUT_DIR}/02_TGP_Editorial_Arqueologia_Filosofia.md" "${OUTPUT_DIR}/03_TGP_Soluciones_Bugs_y_DevOps.md" gs://tgp-mind-memoria-iowa/corpus/ --project tgp-mind`;
  console.log(`Ejecutando: ${uploadCmd}`);
  const out = execSync(uploadCmd, { encoding: 'utf8' });
  console.log(out);
  console.log('🎉 ¡Corpus histórico subido exitosamente a gs://tgp-mind-memoria-iowa/corpus/!');
} catch (err) {
  console.error('Error subiendo a GCS:', err.stdout || err.message);
}
