const fs = require('fs');
let code = fs.readFileSync('C:/Users/ygnat/tgp-mind/index.js', 'utf8');

code = code.replace(
  'FORMATO DE RESPUESTA: JSON con esta estructura exacta:',
  'IMPORTANTE: ESCAPA TODOS LOS SALTOS DE LÍNEA LITERALES USANDO \\\\n. NO USES SALTOS DE LÍNEA REALES (ENTER) DENTRO DE LOS VALORES DEL JSON.\\n\\nFORMATO DE RESPUESTA: JSON con esta estructura exacta:'
);

code = code.replace(
  'Devuelve exactamente este JSON:',
  'Devuelve exactamente este JSON (Escapa saltos de línea como \\\\n si los hubiera, no uses saltos literales):'
);

fs.writeFileSync('C:/Users/ygnat/tgp-mind/index.js', code);
console.log('Fixed prompt instructions');
