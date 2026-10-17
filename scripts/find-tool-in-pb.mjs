import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PlaybooksClient } = require('c:/Users/ygnat/tgp-mind/node_modules/@google-cloud/dialogflow-cx');

async function findStr() {
  const client = new PlaybooksClient({ apiEndpoint: 'us-central1-dialogflow.googleapis.com' });
  const playbookPath = 'projects/tgp-mind/locations/us-central1/agents/7cf1a08f-1b45-48f4-be5f-155eb3ee2848/playbooks/00000000-0000-0000-0000-000000000000';
  const [pb] = await client.getPlaybook({ name: playbookPath });
  const str = JSON.stringify(pb, null, 2);
  const lines = str.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('268ed2ac')) {
      console.log('Line', i + 1, ':', l);
    }
  });
}
findStr();
