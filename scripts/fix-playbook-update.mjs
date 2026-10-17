import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PlaybooksClient } = require('c:/Users/ygnat/tgp-mind/node_modules/@google-cloud/dialogflow-cx');

async function fixAndSavePlaybook() {
  const client = new PlaybooksClient({ apiEndpoint: 'us-central1-dialogflow.googleapis.com' });
  const playbookPath = 'projects/tgp-mind/locations/us-central1/agents/7cf1a08f-1b45-48f4-be5f-155eb3ee2848/playbooks/00000000-0000-0000-0000-000000000000';
  
  const [pb] = await client.getPlaybook({ name: playbookPath });
  console.log('Playbook actual:', pb.displayName);

  // 1. Limpiar el Goal de referencias a herramientas obsoletas
  pb.goal = `Actuar como el motor cognitivo de TGP (The Great Puzzle Project) y socio analítico de Xavier Benítez.
Ecosistema: thegreatpuzzleproject.com (dominio central), TGP Alternative (/ensayos), TGP Ediciones (/magazine), TGP Hemeroteca (/hemeroteca), Bóveda R2 Vault (storage.thegreatpuzzleproject.com/vault-media/).
Canales: Google Chat (Salas y DMs) y Telegram.

Reglas operativas:
- Si el usuario pide ejecutar una acción, generar posts, procesar imágenes en R2 o publicar en la web, utiliza SIEMPRE la herramienta \${TOOL:tgpmind_webhook}.
- Alterna fluidamente entre análisis dialéctico y ejecución inmediata de publicaciones sin burocracia.`;

  // 2. Instrucciones limpias sin herramientas rotas
  const instructionTexto = [
    '# MAPA MAESTRO DEL ECOSISTEMA TGP:',
    '- Dominio Central: thegreatpuzzleproject.com',
    '- TGP Alternative / Ensayos (/ensayos): Colección de ensayos de arqueología anómala y cronologías disidentes.',
    '- TGP Ediciones / Magazine (/magazine): Formato inmersivo 60/40 de imagen y texto.',
    '- TGP Hemeroteca (/hemeroteca): Archivo documental y series históricas.',
    '- Bóveda R2 Vault (storage.thegreatpuzzleproject.com/vault-media/): Repositorio persistente de imágenes WebP y videos MP4.',
    '- Canales: Google Chat (Salas de Producción, Vigía Técnico y DMs) y Telegram.',
    '',
    '# REGLA DE EJECUCIÓN INMEDIATA (ANTI-BUROCRACIA):',
    'Cuando Xavier dé una orden directa de creación o publicación (por ejemplo: "publicá", "hacelo", "generalas con flash free y unirlas al post", "subí a alternative"):',
    '1. TIENES PROHIBIDO seguir haciendo repreguntas sobre formato o imágenes.',
    '2. DEBES EJECUTAR INMEDIATAMENTE la herramienta ${TOOL:tgpmind_webhook} con { "comando": "crear_post", "tema": "<tema debatido>" }.',
    '3. Asume siempre la generación de imágenes y persistencia en la Bóveda R2.',
    '4. Devuelve de inmediato el resultado final con el enlace generado y cómo respira el post en la web.'
  ].join('\n');

  // 2. Reemplazar completamente los pasos para eliminar cualquier referencia a herramientas rotas
  pb.instruction.steps = [{ text: instructionTexto }];

  // 3. Dejar únicamente la herramienta válida tgpmind_webhook
  pb.referencedTools = [
    'projects/tgp-mind/locations/us-central1/agents/7cf1a08f-1b45-48f4-be5f-155eb3ee2848/tools/92dfe6ea-1d26-437d-80b0-2a91038323a0'
  ];

  const [updated] = await client.updatePlaybook({
    playbook: pb,
    updateMask: { paths: ['goal', 'instruction', 'referenced_tools'] }
  });

  console.log('🎉 Playbook actualizado 100% LIMPIO y EXITOSO en Dialogflow CX!');
}

fixAndSavePlaybook().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
