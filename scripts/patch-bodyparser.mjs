import fs from 'node:fs';

const filePath = 'c:\\Users\\ygnat\\tgp-mind\\index.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = 'const PORT = process.env.PORT || 8080;';
const middleware = `
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
`;

if (!content.includes('app.use(express.json')) {
  content = content.replace(target, target + '\n' + middleware);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ app.use(express.json) inyectado con éxito en tgp-mind');
} else {
  console.log('ℹ️ express.json ya estaba presente');
}
