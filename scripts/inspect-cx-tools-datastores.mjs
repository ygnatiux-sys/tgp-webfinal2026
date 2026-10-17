import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ToolsClient, AgentsClient, PlaybooksClient } = require('c:/Users/ygnat/tgp-mind/node_modules/@google-cloud/dialogflow-cx');

const parent = 'projects/tgp-mind/locations/us-central1/agents/7cf1a08f-1b45-48f4-be5f-155eb3ee2848';

async function main() {
  const toolsClient = new ToolsClient({ apiEndpoint: 'us-central1-dialogflow.googleapis.com' });
  const playbooksClient = new PlaybooksClient({ apiEndpoint: 'us-central1-dialogflow.googleapis.com' });

  console.log('--- TOOLS ---');
  try {
    const [tools] = await toolsClient.listTools({ parent });
    for (const t of tools) {
      console.log(`Tool: ${t.displayName} (${t.name})`);
      if (t.dataStoreSpec) {
        console.log('  DataStoreSpec:', JSON.stringify(t.dataStoreSpec));
      }
      if (t.openApiSpec) {
        console.log('  OpenApiSpec present');
      }
    }
  } catch (e) {
    console.error('Error listing tools:', e.message);
  }

  console.log('\n--- PLAYBOOK REFERENCED TOOLS ---');
  try {
    const [pb] = await playbooksClient.getPlaybook({
      name: `${parent}/playbooks/00000000-0000-0000-0000-000000000000`
    });
    console.log('Referenced tools in playbook:', pb.referencedTools);
  } catch (e) {
    console.error('Error getting playbook:', e.message);
  }
}

main();
