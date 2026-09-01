import { execSync } from 'node:child_process';

// Configuración del subdominio o proyecto
const BRANCH = 'main';
const SUBDOMINIO = 'thegreatpuzzleproject.com';
const COMMIT_MSG = process.argv[2] || `Sync (${SUBDOMINIO}): ${new Date().toISOString().slice(0, 10)}`;

function run(cmd) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  console.log(`\n🚀 Iniciando sincronización para [${SUBDOMINIO}]...\n`);
  
  run(`git pull origin ${BRANCH}`);
  run('git add .');
  
  // Verifica si hay cambios en staging antes de hacer commit
  const status = execSync('git status --porcelain').toString().trim();
  if (status) {
    run(`git commit -m "${COMMIT_MSG}"`);
    run(`git push origin ${BRANCH}`);
    console.log('\n✅ Sincronización completada con éxito.\n');
  } else {
    console.log('\nℹ️ No hay cambios pendientes para subir.\n');
  }
} catch (error) {
  console.error('\n❌ Error durante la sincronización:', error.message);
  process.exit(1);
}
