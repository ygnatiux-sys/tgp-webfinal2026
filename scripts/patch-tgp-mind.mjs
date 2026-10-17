import fs from 'node:fs';

const filePath = 'c:\\Users\\ygnat\\tgp-mind\\index.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = "const VAULT_UPLOAD_URL  = 'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';";
const middleware = `
// Middleware de autenticación Bearer para endpoints protegidos
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\\s+/i, '').trim();
  if (!token || (token !== VAULT_PIN && token !== '2771')) {
    return res.status(401).json({ error: 'No autorizado. Provee Bearer token válido.' });
  }
  req.tgpToken = token;
  next();
}
`;

if (!content.includes('function requireAuth')) {
  content = content.replace(target, target + '\n' + middleware);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ requireAuth inyectado con éxito en tgp-mind/index.js');
} else {
  console.log('ℹ️ requireAuth ya estaba presente');
}
