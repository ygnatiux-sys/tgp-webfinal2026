import fs from 'fs/promises';
import path from 'path';

const VAULT_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/transmute-image';
const BACKUP_URL = 'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';

const WIKIMEDIA_REGEX = /https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/[^\s"'<>\)]+/g;

async function walkDir(dir) {
  let results = [];
  const list = await fs.readdir(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = await fs.stat(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(await walkDir(file));
    } else {
      if (file.endsWith('.astro') || file.endsWith('.mdx') || file.endsWith('.svelte') || file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  }
  return results;
}

async function transmuteImage(url, pin) {
  console.log(`[WikiForge] Transmutando: ${url.substring(0, 50)}...`);
  
  try {
    let res = await fetch(VAULT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pin}`,
      },
      body: JSON.stringify({ imageUrl: url, url, mode: 'wikiforge' }),
    });

    if (!res.ok) {
      console.warn(`[WikiForge] Fallo en /transmute-image (${res.status}), intentando /vault-ingest...`);
      res = await fetch(BACKUP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pin}`,
        },
        body: JSON.stringify({ imageUrl: url, url, mode: 'solo_imagen' }),
      });
    }

    if (!res.ok) {
      throw new Error(`Error API: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const r2Url = data.url || data.image_url || data.r2Url;
    if (!r2Url) throw new Error('Respuesta inválida: falta URL R2');
    
    return r2Url;
  } catch (error) {
    console.error(`[WikiForge] Error transmutando ${url}: ${error.message}`);
    return null;
  }
}

async function main() {
  const pin = process.argv[2];
  if (!pin || pin.length !== 4) {
    console.error('ERROR: Debes proporcionar el PIN de seguridad de 4 dígitos.');
    console.error('Uso: node scripts/migrate-wikimedia-r2.mjs <PIN>');
    process.exit(1);
  }

  console.log('--- Iniciando Migración WikiForge a R2 ---');
  
  const srcDir = path.resolve('./src');
  const files = await walkDir(srcDir);
  let totalReplaced = 0;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const matches = content.match(WIKIMEDIA_REGEX);
    
    if (matches && matches.length > 0) {
      console.log(`\nArchivo: ${path.relative(process.cwd(), file)}`);
      console.log(`> Encontradas ${matches.length} URLs de Wikimedia.`);
      
      let newContent = content;
      // Usamos Set para evitar transmutar la misma imagen varias veces en el mismo archivo
      const uniqueUrls = [...new Set(matches)];
      
      for (const url of uniqueUrls) {
        const cleanUrl = url.endsWith(']') || url.endsWith('"') || url.endsWith("'") 
            ? url.slice(0, -1) 
            : url;

        const r2Url = await transmuteImage(cleanUrl, pin);
        
        if (r2Url) {
          // Reemplazar todas las ocurrencias exactas de la URL de Wikimedia por la de R2
          newContent = newContent.split(cleanUrl).join(r2Url);
          console.log(`  ✓ ${cleanUrl.substring(0, 30)}... -> ${r2Url}`);
          totalReplaced++;
        }
      }
      
      if (newContent !== content) {
        await fs.writeFile(file, newContent, 'utf-8');
        console.log(`> Archivo guardado con éxito.`);
      }
    }
  }

  console.log(`\n--- Migración Completada ---`);
  console.log(`Total de URLs de Wikimedia reemplazadas por R2: ${totalReplaced}`);
}

main().catch(console.error);
