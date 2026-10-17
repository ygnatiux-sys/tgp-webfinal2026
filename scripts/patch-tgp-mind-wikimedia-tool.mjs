import fs from 'node:fs';

const filePath = 'c:\\Users\\ygnat\\tgp-mind\\index.js';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('/cx-tool-wikimedia')) {
  const target = '// ============================================================================\n// ENDPOINT: POST /telegram-webhook — Puente Telegram ↔ Dialogflow CX';
  const newEndpoint = `// ============================================================================
// ENDPOINT: POST /cx-tool-wikimedia — Tool de Búsqueda de Imágenes para Dialogflow CX
// ============================================================================
app.post('/cx-tool-wikimedia', async (req, res) => {
  try {
    const query = req.body?.query || req.body?.buscar || 'megalitos';
    console.log(\`[/cx-tool-wikimedia] Dialogflow CX solicitando imágenes para: "\${query}"\`);
    const wikiImages = await buscarWikimedia(query);
    const formatted = (wikiImages || []).slice(0, 5).map((img, i) => ({
      title: img.title || \`\${query} - Figura \${i + 1}\`,
      url: img.url || img,
      license: img.license || 'Creative Commons / Wikimedia Commons',
      author: img.author || 'Dominio Público / Wikimedia'
    }));

    return res.json({
      images: formatted,
      message: formatted.length ? \`Se encontraron \${formatted.length} imágenes pertinentes.\` : 'No se encontraron imágenes en Wikimedia para esta consulta.'
    });
  } catch (err) {
    console.error('[/cx-tool-wikimedia Error]:', err);
    return res.json({ images: [], message: 'Error consultando Wikimedia: ' + err.message });
  }
});

`;

  code = code.replace(target, newEndpoint + '\n' + target);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Endpoint /cx-tool-wikimedia inyectado exitosamente en index.js');
} else {
  console.log('ℹ️ /cx-tool-wikimedia ya existía en index.js');
}
