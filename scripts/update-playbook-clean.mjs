import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PlaybooksClient } = require('c:/Users/ygnat/tgp-mind/node_modules/@google-cloud/dialogflow-cx');

async function updatePlaybook() {
  const client = new PlaybooksClient({ apiEndpoint: 'us-central1-dialogflow.googleapis.com' });
  const playbookPath = 'projects/tgp-mind/locations/us-central1/agents/7cf1a08f-1b45-48f4-be5f-155eb3ee2848/playbooks/00000000-0000-0000-0000-000000000000';
  
  const [pb] = await client.getPlaybook({ name: playbookPath });
  console.log('Obtenido playbook actual:', pb.displayName);

  // Agregar paso de instrucción al final manteniendo las herramientas existentes
  const instructionTexto = [
    '# MAPA MAESTRO DEL ECOSISTEMA TGP:',
    '- Dominio Central: thegreatpuzzleproject.com',
    '- TGP Alternative / Ensayos (/ensayos): Colección de ensayos profundos y arqueología anómala.',
    '- TGP Ediciones / Magazine (/magazine): Formato inmersivo 60/40 de imagen y texto.',
    '- TGP Hemeroteca (/hemeroteca): Archivo documental y series históricas.',
    '- Bóveda R2 Vault (storage.thegreatpuzzleproject.com/vault-media/): Repositorio persistente de imágenes WebP y videos MP4.',
    '- Canales: Google Chat (Salas de Producción, Vigía Técnico y DMs) y Telegram.',
    '',
    '# REGLA DE EJECUCIÓN INMEDIATA (ANTI-BUROCRACIA):',
    'Cuando Xavier dé una orden directa de creación o publicación (por ejemplo: "publicá", "hacelo", "generalas con flash free y unilas al post", "subí a alternative"):',
    '1. TIENES PROHIBIDO seguir haciendo repreguntas sobre formato o imágenes.',
    '2. DEBES EJECUTAR INMEDIATAMENTE la herramienta ${TOOL:tgpmind_webhook} con { "comando": "crear_post", "tema": "<tema debatido>" }.',
    '3. Si el usuario pide imágenes o referencias visuales, ejecuta la herramienta ${TOOL:wikimedia_search} o asume generación en la Bóveda R2.',
    '4. Devuelve de inmediato el resultado final con el enlace generado y cómo respira el post en la web.'
  ].join('\n');

  pb.instruction.steps.push({ text: instructionTexto });

  const [updated] = await client.updatePlaybook({
    playbook: pb,
    updateMask: { paths: ['instruction'] }
  });

  console.log('🎉 Playbook actualizado con éxito en Dialogflow CX!');
}

updatePlaybook().catch(err => {
  console.error('Error al actualizar playbook:', err);
  process.exit(1);
});
