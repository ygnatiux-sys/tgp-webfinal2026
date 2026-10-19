const payload = {
  imageUrls: [
    'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp',
    'https://storage.thegreatpuzzleproject.com/vault-media/1792217505902-206dbd92.webp',
    'https://storage.thegreatpuzzleproject.com/vault-media/1792217519518-b5ba057e.webp',
    'https://storage.thegreatpuzzleproject.com/vault-media/1792217532545-045e2f7b.webp'
  ],
  titulo: 'Nan Madol: El Enigma Megalítico',
  template: 'CLASICO',
  rhythm: 'LENTO',
  slug: 'nan-madol-loop',
  texto: 'Nan Madol no fue construida sobre tierra firme, sino forjada directamente sobre el océano mediante noventa islotes de piedra volcánica.'
};

async function render() {
  console.log('⚡ Disparando POST /render-cinematico en tgp-mind...');
  try {
    const res = await fetch('https://tgp-mind-alternative-713934653057.us-central1.run.app/render-cinematico', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 2771'
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const text = await res.text();
    console.log(`Status HTTP: ${status}`);
    console.log(`Respuesta:\n${text}`);
  } catch (err) {
    console.error('Error de red:', err.message);
  }
}

render();
