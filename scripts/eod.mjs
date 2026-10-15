import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const REPORT_FILE = path.join(__dirname, 'doctor-report.json');

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  🚀 TGP PIPELINE ESCALONADO: END OF DAY (EOD) CIERRE     ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

function runStep(title, scriptPath) {
  console.log(`\n▶ [PASO] ${title}...`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error(`\n❌ [FALLO EN EL PASO] ${title}`);
    
    // Si existe reporte del doctor, mostrar el prompt directo para el asistente AI
    if (fs.existsSync(REPORT_FILE)) {
      try {
        const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║  🚨 TGP AGENT PROMPT: ERRORES DETECTADOS PARA AUTO-SANEAR ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('\nCopia y envíame este bloque al chat para que lo sanee de inmediato:\n');
        console.log('--- COPIAR INICIO ---');
        console.log('Por favor auto-sanea los siguientes errores reportados por npm run doctor:\n');
        console.log(JSON.stringify(report, null, 2));
        console.log('--- COPIAR FIN ---\n');
      } catch (e) {}
    }

    console.error('⛔ Pipeline EOD cancelado para proteger la estabilidad del repositorio.');
    process.exit(1);
  }
}

// 1. Ejecución Escalonada: Sanear primero para corregir tags y formatos
runStep('1/4 Sanear Contenido & Sintaxis MDX', path.join(__dirname, 'sanear.mjs'));

// 2. Ejecución Escalonada: Auto-Vault R2 para subir assets locales y transmutar Wikimedia
runStep('2/4 Auto-Vault R2: Subida y Transmutación a Cloudflare R2', path.join(__dirname, 'auto-r2-vault.mjs'));

// 3. Ejecución Escalonada: Doctor para auditar integridad y seguridad de Desk
runStep('3/4 Doctor: Auditoría de Integridad, Secretos & Seguridad', path.join(__dirname, 'doctor.mjs'));

// 4. Ejecución Escalonada: Git Sync a Main
runStep('4/4 Git Sync: Commit Seguro y Push a Cloudflare', path.join(__dirname, 'sync.mjs'));

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  🎉 CIERRE DE JORNADA EOD COMPLETADO CON ÉXITO           ║');
console.log('║  Repositorio limpio, verificado y desplegado en Cloudflare ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');
