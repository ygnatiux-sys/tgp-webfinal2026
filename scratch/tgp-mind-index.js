// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TGP-MIND Â· index.js â€” Motor Cognitivo Central (Cloud Run)
// Refactorizado: Promise.all Â· Tiered Routing Â· Director CinemÃ¡tico
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
'use strict';

import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 8080;

// â”€â”€â”€ SDK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Modelos bifurcados
const MODEL_FLASH = 'gemini-1.5-flash'; // routerNLP + cinematic director + modo estÃ¡ndar
const MODEL_PRO   = 'gemini-1.5-pro';   // redacciÃ³n de ensayos extensos

// URLs de servicios externos (inyectadas desde Cloud Run secrets)
const GITHUB_TOKEN        = process.env.GITHUB_TOKEN;
const GITHUB_REPO         = process.env.GITHUB_REPO;        // 'usuario/repo'
const GITHUB_BRANCH       = process.env.GITHUB_BRANCH || 'main';
const R2_UPLOAD_URL       = process.env.R2_UPLOAD_URL;
const REMOTION_ENGINE_URL = process.env.REMOTION_ENGINE_URL; // tgp-remotion-engine en Cloud Run
const WIKIMEDIA_PROXY_URL = process.env.WIKIMEDIA_PROXY_URL;

// â”€â”€â”€ GENOMA ESTILÃSTICO TGP (System Prompt RaÃ­z) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TGP_GENOME = {
  base: `Eres el motor analÃ­tico de The Great Puzzle Project. Tu identidad es la de un ensayista que piensa en imÃ¡genes y argumenta con rigor.

ARQUITECTURA: Abre con una tensiÃ³n conceptual o imagen material fuerte â€” un objeto, un umbral, una fractura temporal. No hay introducciÃ³n; hay entrada directa al nudo. Desarrolla articulando el conocimiento racional con formas simbÃ³licas, haciendo que cada secciÃ³n avance la tesis central sin redundancia.

TONO: Sobrio, agudo, con calidez humanista. Cero introducciones mecÃ¡nicas del tipo "En este ensayo exploraremos...". Cero clichÃ©s culturales. Cero moralejas explÃ­citas al final.

FOCO ESTRUCTURAL: Presta atenciÃ³n a las condiciones materiales de la historia â€” el tiempo como erosiÃ³n, la memoria como arquitectura, la experiencia humana como evidencia primaria. No declares tu rol ni tu metodologÃ­a. Ve al nÃºcleo de inmediato.`,

  flash: `LONGITUD: Aproximadamente 750 palabras. CondensaciÃ³n sin pÃ©rdida. Cada oraciÃ³n debe sostener su peso. La brevedad como rigor intelectual, no como simplificaciÃ³n.`,

  pro: `LONGITUD: Aproximadamente 2000 palabras. MÃ¡xima densidad conceptual. Cada pÃ¡rrafo debe ganar su espacio dentro del argumento. Desarrolla las implicaciones histÃ³ricas, filosÃ³ficas y simbÃ³licas sin acelerar hacia conclusiones prematuras. La extensiÃ³n es licencia para la profundidad, no para la redundancia.`,
};

function getSystemPrompt(engine = 'flash') {
  return `${TGP_GENOME.base}\n\n${engine === 'pro' ? TGP_GENOME.pro : TGP_GENOME.flash}`;
}

// â”€â”€â”€ MIDDLEWARE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || token.length !== 4) {
    return res.status(401).json({ error: 'PIN de seguridad invÃ¡lido o ausente.' });
  }
  req.tgpToken = token;
  next();
}

// â”€â”€â”€ ROUTER NLP (siempre Flash) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function routerNLP(prompt) {
  const model = genAI.getGenerativeModel({ model: MODEL_FLASH });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `Analiza esta solicitud y devuelve SOLO JSON (sin markdown, sin texto extra):
{ "tema": "string", "tipo": "ensayo|magazine|artefacto|otro", "idioma": "es|en", "era": "string|null", "entidades": ["string"] }

Solicitud: "${prompt}"` }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 256 },
  });
  try {
    const text = result.response.text();
    return JSON.parse(text.replace(/\`\`\`json?|\`\`\`/g, '').trim());
  } catch {
    return { tema: prompt, tipo: 'ensayo', idioma: 'es', era: null, entidades: [] };
  }
}

// â”€â”€â”€ DIRECTOR DE ORQUESTA CINEMÃTICO (Paso 4.5, siempre Flash) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function directorCinematico(markdownText) {
  const model = genAI.getGenerativeModel({ model: MODEL_FLASH });
  const result = await model.generateContent({
    systemInstruction: 'Eres un curador cinematogrÃ¡fico experto. Respondes SOLO con JSON vÃ¡lido, sin markdown, sin explicaciones.',
    contents: [{
      role: 'user',
      parts: [{ text: `Lee este ensayo y clasifÃ­calo cinematogrÃ¡ficamente.

Devuelve exactamente este JSON:
{
  "template": "KUBRICK|TARKOVSKY|PASOLINI|TARANTINO|BERGMAN|LYNCH|CLASICO",
  "badge": "JustificaciÃ³n en mÃ¡ximo 15 palabras",
  "palette": ["#hex1", "#hex2", "#hex3"],
  "rhythm": "LENTO|MODERADO|URGENTE"
}

Criterios:
- KUBRICK: geometrÃ­a simÃ©trica, orden frÃ­o, anÃ¡lisis del poder y la instituciÃ³n
- TARKOVSKY: tiempo dilatado, naturaleza como conciencia, memoria y espiritualidad
- PASOLINI: cuerpo histÃ³rico, materialidad marxista, lo sagrado en lo profano
- TARANTINO: fragmentaciÃ³n temporal, tensiÃ³n narrativa, cultura como palimpsesto
- BERGMAN: existencia, muerte, silencio estructural, introspecciÃ³n como mÃ©todo
- LYNCH: lo sublime perturbador, surrealismo operativo, lo cotidiano como umbral
- CLASICO: documental histÃ³rico sobrio, Efecto Ken Burns, fundidos encadenados, narraciÃ³n lineal-contemplativa

Para "palette": 3 colores hexadecimales que evoquen el estilo de ese director.
Para "rhythm": LENTO (<1 corte/30s), MODERADO (1-3 cortes/30s), URGENTE (>3 cortes/30s).

Ensayo (primeros 3000 caracteres):
${markdownText.slice(0, 3000)}` }]
    }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 512 },
  });

  try {
    const text = result.response.text();
    return JSON.parse(text.replace(/\`\`\`json?|\`\`\`/g, '').trim());
  } catch {
    return {
      template: 'TARKOVSKY',
      badge: 'Tiempo dilatado, memoria como arquitectura viva',
      palette: ['#8BA888', '#C4A882', '#2C3A47'],
      rhythm: 'LENTO',
    };
  }
}

// â”€â”€â”€ GENERACIÃ“N DE TEXTO CON TIERED ROUTING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generarTexto({ tema, contexto = '', entidades = [], engine = 'flash' }) {
  const modelName = engine === 'pro' ? MODEL_PRO : MODEL_FLASH;
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `${getSystemPrompt(engine)}

Tema central del ensayo: ${tema}
${entidades.length ? 'Entidades clave a integrar: ' + entidades.join(', ') : ''}
${contexto ? 'Contexto documental adicional:\n' + contexto : ''}

Redacta el ensayo completo ahora, comenzando directamente con el primer pÃ¡rrafo.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: engine === 'pro' ? 4096 : 1536 },
  });

  return result.response.text();
}

// â”€â”€â”€ GENERACIÃ“N DE CONTENIDO MAGAZINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generarContenidoMagazine({ tema, imagenesWiki = [], engine = 'flash' }) {
  const modelName = engine === 'pro' ? MODEL_PRO : MODEL_FLASH;
  const model = genAI.getGenerativeModel({ model: modelName });

  const galeriaRef = imagenesWiki.slice(0, 5).map((img, i) =>
    `[Imagen ${i + 1}]: ${img.url || img} â€” ${img.title || 'Artefacto histÃ³rico'}`
  ).join('\n');

  const prompt = `${getSystemPrompt(engine)}

EstÃ¡s generando una ediciÃ³n inmersiva de TGP Magazine (formato 60/40: 60% imagen, 40% texto denso).

Tema: ${tema}

ImÃ¡genes de referencia disponibles de Wikimedia:
${galeriaRef || 'No disponibles aÃºn â€” usa tu conocimiento para describir imÃ¡genes pertinentes.'}

FORMATO DE RESPUESTA: JSON con esta estructura exacta:
{
  "titulo": "TÃ­tulo del ensayo (descriptivo, sin clickbait)",
  "subtitulo": "SubtÃ­tulo o volanta editorial",
  "excerpt": "PÃ¡rrafo de presentaciÃ³n, 2-3 oraciones",
  "body": "El cuerpo del ensayo en Markdown. ${engine === 'pro' ? '~2000 palabras.' : '~750 palabras.'} Sin YAML frontmatter.",
  "category": "CategorÃ­a editorial",
  "slug": "slug-del-titulo-en-kebab-case",
  "date": "${new Date().toISOString().split('T')[0]}",
  "folios": [
    {
      "id": 1,
      "titulo": "TÃ­tulo del folio",
      "tipo": "ensayo",
      "analisis": "AnÃ¡lisis iconogrÃ¡fico de la imagen (2-3 oraciones)",
      "fragmento": "PÃ¡rrafo correspondiente a este folio"
    }
  ]
}

Devuelve SOLO el JSON, sin markdown fence, sin texto adicional.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: engine === 'pro' ? 8192 : 3072,
    },
  });

  const text = result.response.text();
  return JSON.parse(text.replace(/\`\`\`json?|\`\`\`/g, '').trim());
}

// â”€â”€â”€ WIKIMEDIA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function buscarWikimedia(tema) {
  if (!WIKIMEDIA_PROXY_URL) return [];
  try {
    const res = await fetch(WIKIMEDIA_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buscar: tema }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.imagenes || data.resultados || []);
  } catch (e) {
    console.warn('[tgp-mind] Wikimedia lookup failed:', e.message);
    return [];
  }
}

// â”€â”€â”€ SUBIDA A R2 (con fallback a URL cruda) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function subirImagenesAR2(imagenesWiki, token) {
  if (!R2_UPLOAD_URL || !imagenesWiki.length) return imagenesWiki;

  const results = await Promise.allSettled(
    imagenesWiki.map(async (img) => {
      try {
        const imgUrl = img.url || img;
        const res = await fetch(R2_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ url: imgUrl, mode: 'solo_imagen', source: 'wikimedia' }),
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error('R2 upload ' + res.status);
        const data = await res.json();
        return { ...img, url: data.image_url || data.url || imgUrl, r2: true };
      } catch (e) {
        console.warn('[tgp-mind] R2 upload failed, using raw Wikimedia URL:', e.message);
        return img; // fallback: URL cruda de Wikimedia â€” el texto NO se pierde
      }
    })
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
}

// â”€â”€â”€ COMMIT A GITHUB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function commitMDXaGitHub({ slug, titulo, frontmatter, body, draft = true }) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.warn('[tgp-mind] GitHub credentials missing, skipping commit.');
    return null;
  }

  const fm = [
    '---',
    'title: "' + titulo.replace(/"/g, "'") + '"',
    'slug: "' + slug + '"',
    'abstract: "' + (frontmatter.abstract || '').replace(/"/g, "'") + '"',
    'volanta: "' + (frontmatter.volanta || 'TGP Mind').replace(/"/g, "'") + '"',
    'layoutMode: "' + (frontmatter.layoutMode || 'magazine') + '"',
    'powertype: "' + (frontmatter.powertype || 'Revista Inmersiva 60/40') + '"',
    'draft: ' + draft,
    'date: "' + (frontmatter.date || new Date().toISOString()) + '"',
    'category: "' + (frontmatter.category || 'TGP Mind') + '"',
    'coverImage: "' + (frontmatter.coverImage || '') + '"',
    'gallery:',
    ...(frontmatter.gallery || []).map(u => '  - "' + u + '"'),
    '---',
    '',
  ].join('\n');

  const mdxContent = fm + body;
  const filePath = 'src/content/ensayos/' + slug + '.mdx';
  const contentB64 = Buffer.from(mdxContent, 'utf-8').toString('base64');

  let sha;
  try {
    const check = await fetch(
      'https://api.github.com/repos/' + GITHUB_REPO + '/contents/' + filePath + '?ref=' + GITHUB_BRANCH,
      { headers: { Authorization: 'token ' + GITHUB_TOKEN, Accept: 'application/vnd.github.v3+json' } }
    );
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
    }
  } catch {}

  const payload = {
    message: 'feat(tgp-mind): ' + (draft ? 'borrador' : 'publicar') + ' ensayo "' + titulo + '"',
    content: contentB64,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(
    'https://api.github.com/repos/' + GITHUB_REPO + '/contents/' + filePath,
    {
      method: 'PUT',
      headers: {
        Authorization: 'token ' + GITHUB_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error('GitHub commit failed: ' + res.status + ' â€” ' + err);
  }

  return await res.json();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENDPOINT: GET /health
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tgp-mind',
    version: '3.0.0',
    models: { router: MODEL_FLASH, redaccion: MODEL_FLASH + ' | ' + MODEL_PRO },
    features: ['tiered-routing', 'cinematic-director', 'promise-all', 'render-cinematico'],
    remotion: REMOTION_ENGINE_URL ? 'configured' : 'NOT_CONFIGURED',
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENDPOINT: POST /inbox â€” Ensayos MDX
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.post('/inbox', requireAuth, async (req, res) => {
  const {
    prompt_natural, titulo, era, html,
    mode = 'ensayo', draft = true,
    engine = 'flash',
  } = req.body;

  const token = req.tgpToken;

  try {
    console.log('[/inbox] engine=' + engine + ' draft=' + draft);

    const ruta = await routerNLP(prompt_natural || titulo);
    const wikiImagesRaw = await buscarWikimedia(ruta.tema || titulo || prompt_natural);

    // â”€â”€â”€ PROMISE.ALL: texto + imÃ¡genes en paralelo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [textoMarkdown, imagenesConR2] = await Promise.all([
      generarTexto({
        tema: ruta.tema || titulo || prompt_natural,
        contexto: html || '',
        entidades: ruta.entidades || [],
        engine,
      }),
      subirImagenesAR2(wikiImagesRaw, token),
    ]);
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const cleanTitulo = titulo || ruta.tema || prompt_natural.slice(0, 80);
    const slug = cleanTitulo
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      .slice(0, 60) + '-' + Date.now().toString().slice(-4);

    const galleryUrls = imagenesConR2
      .map(img => img && (img.url || img))
      .filter(u => typeof u === 'string' && u.startsWith('http'));

    const frontmatter = {
      abstract: textoMarkdown.split('\n').find(l => l.length > 40) || '',
      volanta: era || 'TGP Mind',
      layoutMode: mode === 'magazine' ? 'magazine' : 'ensayo',
      powertype: 'Ensayo HistÃ³rico',
      date: new Date().toISOString(),
      category: ruta.tipo || 'Historia',
      coverImage: galleryUrls[0] || '',
      gallery: galleryUrls,
    };

    let githubResult = null;
    try {
      githubResult = await commitMDXaGitHub({ slug, titulo: cleanTitulo, frontmatter, body: textoMarkdown, draft });
    } catch (e) {
      console.error('[/inbox] GitHub commit error (non-fatal):', e.message);
    }

    return res.json({
      ok: true, slug, title: cleanTitulo, draft, engine,
      mdx_preview: textoMarkdown.slice(0, 600),
      coverImage: galleryUrls[0] || null,
      gallery: galleryUrls,
      github: githubResult
        ? { committed: true, sha: githubResult?.content?.sha }
        : { committed: false },
    });

  } catch (err) {
    console.error('[/inbox] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENDPOINT: POST /magazine â€” EdiciÃ³n 60/40 con Director CinemÃ¡tico
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.post('/magazine', requireAuth, async (req, res) => {
  const {
    tema, prompt_natural,
    min_images = 5, theme = 'charcoal',
    draft = true,
    engine = 'flash',
  } = req.body;

  const token = req.tgpToken;
  const topico = tema || prompt_natural || '';

  if (!topico) return res.status(400).json({ error: 'El campo "tema" es requerido.' });

  try {
    console.log('[/magazine] engine=' + engine + ' tema="' + topico.slice(0, 50) + '"');

    const ruta = await routerNLP(topico);
    const wikiImagesRaw = await buscarWikimedia(ruta.tema || topico);

    // â”€â”€â”€ PROMISE.ALL: texto + imÃ¡genes en paralelo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [magazineData, imagenesConR2] = await Promise.all([
      generarContenidoMagazine({ tema: ruta.tema || topico, imagenesWiki: wikiImagesRaw, engine }),
      subirImagenesAR2(wikiImagesRaw, token),
    ]);
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const galleryUrls = imagenesConR2
      .map(img => img && (img.url || img))
      .filter(u => typeof u === 'string' && u.startsWith('http'))
      .slice(0, Math.max(min_images, 5));

    const foliosConR2 = (magazineData.folios || []).map((folio, i) => ({
      ...folio,
      imagenUrl: galleryUrls[i] || (wikiImagesRaw[i] && (wikiImagesRaw[i].url || wikiImagesRaw[i])) || '',
    }));

    const heroUrl = galleryUrls[0] || '';
    const slug = (magazineData.slug || magazineData.titulo || topico)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      .slice(0, 60) + '-' + Date.now().toString().slice(-4);

    const frontmatter = {
      abstract: magazineData.excerpt || '',
      volanta: magazineData.subtitulo || 'EdiciÃ³n Magazine',
      layoutMode: 'magazine',
      powertype: 'Revista Inmersiva 60/40',
      date: new Date().toISOString(),
      category: magazineData.category || 'Magazine',
      coverImage: heroUrl,
      gallery: galleryUrls,
    };

    // Paso 4: Commit a GitHub ANTES del Director CinemÃ¡tico
    let githubResult = null;
    try {
      githubResult = await commitMDXaGitHub({
        slug, titulo: magazineData.titulo,
        frontmatter, body: magazineData.body || '', draft,
      });
    } catch (e) {
      console.error('[/magazine] GitHub commit error (non-fatal):', e.message);
    }

    // â”€â”€â”€ PASO 4.5: DIRECTOR DE ORQUESTA CINEMÃTICO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let cinematic_proposal = null;
    try {
      cinematic_proposal = await directorCinematico(magazineData.body || magazineData.excerpt || topico);
    } catch (e) {
      console.warn('[/magazine] Director cinemÃ¡tico error (non-fatal):', e.message);
      cinematic_proposal = {
        template: 'TARKOVSKY',
        badge: 'Tiempo dilatado, memoria como arquitectura viva',
        palette: ['#8BA888', '#C4A882', '#2C3A47'],
        rhythm: 'LENTO',
      };
    }
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return res.json({
      ok: true,
      titulo: magazineData.titulo,
      subtitulo: magazineData.subtitulo,
      excerpt: magazineData.excerpt,
      body: magazineData.body,
      category: magazineData.category,
      slug, heroUrl,
      date: magazineData.date,
      theme, draft, engine,
      galeria: {
        slider: foliosConR2.map((folio, i) => ({
          id: folio.id || i + 1,
          url: folio.imagenUrl || galleryUrls[i] || '',
          title: folio.titulo || ('Folio ' + (i + 1)),
          analisis: folio.analisis || '',
          fragmento: folio.fragmento || '',
          tipo: folio.tipo || 'IMAGEN',
        })),
      },
      github: githubResult
        ? { committed: true, sha: githubResult?.content?.sha }
        : { committed: false },
      cinematic_proposal,
    });

  } catch (err) {
    console.error('[/magazine] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENDPOINT: POST /render-cinematico â€” Relay a Remotion Engine
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.post('/render-cinematico', requireAuth, async (req, res) => {
  const {
    imageUrls = [], texto = '',
    template = 'TARKOVSKY',
    palette = ['#8BA888', '#C4A882', '#2C3A47'],
    rhythm = 'LENTO',
    titulo = 'Ensayo CinemÃ¡tico TGP',
    slug,
  } = req.body;

  if (!REMOTION_ENGINE_URL) {
    return res.status(503).json({
      error: 'REMOTION_ENGINE_URL no configurada.',
      hint: 'Configura process.env.REMOTION_ENGINE_URL apuntando a tgp-remotion-engine en Cloud Run.',
    });
  }

  if (!imageUrls.length) {
    return res.status(400).json({ error: 'Se requiere al menos 1 URL en "imageUrls".' });
  }

  const fps = 30;
  const duracionPorBloque = rhythm === 'LENTO' ? 150 : rhythm === 'MODERADO' ? 90 : 60;

  const motionTypes = ['ZOOM_IN', 'PAN_LATERAL', 'ZOOM_OUT', 'PAN_VERTICAL', 'ESTATICO'];

  const renderPayload = {
    compositionId: template,
    inputProps: {
      ensayo: {
        titulo,
        estilo: template,
        duracionTotalFotogramas: imageUrls.length * duracionPorBloque,
      },
      orquestacion: imageUrls.map((url, i) => ({
        id: i + 1,
        tipo: 'IMAGEN',
        fuente: url,
        duracion: duracionPorBloque,
        motion: {
          tipo: motionTypes[i % motionTypes.length],
          escalaInicial: 1.0,
          escalaFinal: 1.08,
          x_inicio: i % 2 === 0 ? 0 : -20,
          x_fin: i % 2 === 0 ? 0 : 20,
          y_inicio: 0,
          y_fin: i % 3 === 0 ? -10 : 0,
        },
      })),
      palette, rhythm,
      texto: texto.slice(0, 2000),
    },
    outputFile: 'tgp-cinematico-' + (slug || Date.now()) + '.mp4',
    codec: 'h264',
    fps,
  };

  try {
    console.log('[/render-cinematico] template=' + template + ' imagenes=' + imageUrls.length);

    const renderRes = await fetch(REMOTION_ENGINE_URL + '/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'],
      },
      body: JSON.stringify(renderPayload),
      signal: AbortSignal.timeout(30000),
    });

    if (!renderRes.ok) {
      const errText = await renderRes.text();
      throw new Error('Remotion Engine respondiÃ³ ' + renderRes.status + ': ' + errText);
    }

    const result = await renderRes.json();

    return res.json({
      ok: true,
      jobId: result.jobId || result.id,
      status: result.status || 'queued',
      mp4Url: result.outputUrl || result.mp4Url || null,
      estimatedDuration: Math.round((imageUrls.length * duracionPorBloque) / fps) + 's',
      template,
      frames: imageUrls.length * duracionPorBloque,
    });

  } catch (err) {
    console.error('[/render-cinematico] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// â”€â”€â”€ START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.listen(PORT, () => {
  console.log('[tgp-mind v3.0] Puerto ' + PORT);
  console.log('  Modelos: Flash=' + MODEL_FLASH + ' | Pro=' + MODEL_PRO);
  console.log('  Remotion: ' + (REMOTION_ENGINE_URL || 'NO CONFIGURADO'));
});

