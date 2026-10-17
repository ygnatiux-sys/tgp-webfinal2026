import fs from 'node:fs';

const filePath = 'c:\\Users\\ygnat\\tgp-mind\\index.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Inyectar getSystemPrompt si no está definido
if (!code.includes('function getSystemPrompt(')) {
  const target = '// ─── GENERACIÓN DE TEXTO CON TIERED ROUTING ──────────────────────────────';
  const systemPromptDef = `
// ─── PROMPT EDITORIAL DEL COMPAGNON TGP ─────────────────────────────────────
function getSystemPrompt(engine = 'flash', rol = null) {
  return \`Eres el socio intelectual y compagnon de investigación de The Great Puzzle Project (TGP).
Tu tono es el de un ensayista argentino culto, lúcido, agudo y humano (en la línea de Borges y Bioy Casares), especializado en arqueología anómala, arquitectura megalítica, cronologías disidentes y el misterio del Holoceno.
Escribes en prosa sobria, precisa, cinematográfica y sin condescendencia ni clichés sensacionalistas.\`;
}
`;
  code = code.replace(target, systemPromptDef + '\n' + target);
  console.log('✅ function getSystemPrompt inyectada con éxito');
}

// 2. Localizar el bloque exacto en google-chat-webhook
const targetStart = '// COMPORTAMIENTO EDITORIAL / MULTICANAL (Espacio Producción / General)';
const targetEnd = '// Si es intención de publicación pero no especificó tema';

const idxStart = code.indexOf(targetStart);
const idxEnd = code.indexOf(targetEnd);

if (idxStart === -1 || idxEnd === -1) {
  console.error('❌ No se encontraron los delimitadores en index.js');
  process.exit(1);
}

const replacement = `// COMPORTAMIENTO EDITORIAL / DIALOGFLOW CX MULTI-TURN + CARDS V2
      // ======================================================================
      const cleanSpace = spaceName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanThread = message.thread?.name ? message.thread.name.replace(/[^a-zA-Z0-9_-]/g, '_') : cleanSpace;
      const sessionId = \`gchat_\${cleanThread}\`;

      // Detección de Video Loop Remotion
      const esPedidoLoop = /\\b(loop|video( loop)?|remotion|cinem[aá]tico)\\b/i.test(rawText);
      const esDerinkuyu = /\\b(derinkuyu|capadocia)\\b/i.test(rawText);
      const esNanMadol = /\\b(nan[ -]?madol|ponape|pohnpei)\\b/i.test(rawText);

      // Invocación a Dialogflow CX con sesión persistente
      let dfReplyText = '';
      try {
        const client = getDfSessionsClient();
        const sessionPath = client.projectLocationAgentSessionPath(
          DIALOGFLOW_PROJECT_ID,
          DIALOGFLOW_LOCATION,
          DIALOGFLOW_AGENT_ID,
          sessionId
        );

        const request = {
          session: sessionPath,
          queryInput: {
            text: { text: rawText },
            languageCode: 'es',
          },
        };

        const [dfRes] = await client.detectIntent(request);
        const responseMessages = dfRes.queryResult?.responseMessages || [];
        dfReplyText = responseMessages
          .filter(m => m.text && m.text.text && m.text.text.length > 0)
          .map(m => m.text.text.join('\\n'))
          .join('\\n\\n');
      } catch (errDf) {
        console.error('[/google-chat-webhook Dialogflow CX Error]:', errDf.message);
      }

      // Si es un pedido de Video Loop Remotion, devolvemos CardV2 interactiva de alta fidelidad
      if (esPedidoLoop) {
        let videoUrl = 'https://storage.thegreatpuzzleproject.com/vault-media/loops/derinkuyu/derinkuyu-hero-16x9.mp4';
        let previewImg = 'https://storage.thegreatpuzzleproject.com/vault-media/1792224263352-03d6d25b.webp';
        let tituloCard = '🗿 TGP Cinematic Loop · Derinkuyu (Capadocia)';
        let subTituloCard = '10.0s (300 frames @ 30fps) · Remotion v2 en Cloud Run';

        if (esNanMadol) {
          videoUrl = 'https://storage.thegreatpuzzleproject.com/vault-media/loops/nan-madol/nan-madol-hero-16x9.mp4';
          previewImg = 'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp';
          tituloCard = '🗿 TGP Cinematic Loop · Nan Madol (Micronesia)';
        }

        const cardV2 = {
          cardId: 'tgp-loop-' + Date.now(),
          card: {
            header: {
              title: tituloCard,
              subtitle: subTituloCard,
              imageUrl: previewImg,
              imageType: 'SQUARE'
            },
            sections: [
              {
                header: 'ESPECIFICACIONES DEL RENDER CINEMÁTICO',
                widgets: [
                  {
                    decoratedText: {
                      topLabel: 'Pipeline Autónomo',
                      text: '<b>Remotion v2 Cloud Run + 4 Flash Images + R2 Vault</b>',
                      startIcon: { knownIcon: 'VIDEO_CAMERA' }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: 'Métricas de Reproducción',
                      text: '10.0s · H.264 CRF 28 (2.39 MB) · 4 Planos Soft Dissolve 20f',
                      startIcon: { knownIcon: 'CLOCK' }
                    }
                  },
                  {
                    image: {
                      imageUrl: previewImg,
                      altText: 'Fotograma Maestro'
                    }
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '▶️ REPRODUCIR VIDEO EN R2 (MP4)',
                          icon: { knownIcon: 'VIDEO_CALL' },
                          onClick: {
                            openLink: {
                              url: videoUrl
                            }
                          }
                        },
                        {
                          text: '📄 VER ENSAYO EN TGP WEB',
                          icon: { knownIcon: 'BOOKMARK' },
                          onClick: {
                            openLink: {
                              url: 'https://thegreatpuzzleproject.com/ensayos/'
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        };

        return res.json({
          text: dfReplyText || 'Acá tenés el render del loop cinematográfico de 10 segundos forjado para este frente.',
          cardsV2: [cardV2]
        });
      }

      // Si Dialogflow CX devolvió respuesta conversacional, responder manteniendo diálogo
      if (dfReplyText && dfReplyText.trim().length > 0) {
        return res.json({ text: dfReplyText });
      }

      // Variables para comandos de publicación
      let esPublicacion = false;
      let tema = '';
      let destinos = [];
      let respuestaChat = '';

      if (/^\\/blogger\\b/i.test(rawText)) {
        esPublicacion = true;
        destinos = ['blogger'];
        tema = argText || rawText.replace(/^\\/blogger\\s*/i, '').trim();
        respuestaChat = \`Recibido el comando directo para Blogger sobre *"\${tema || 'el tema indicado'}"*.\`;
      } else if (/^\\/public(ar)?\\b/i.test(rawText)) {
        esPublicacion = true;
        destinos = ['alternative'];
        tema = argText || rawText.replace(/^\\/public(ar)?\\s*/i, '').trim();
        respuestaChat = \`Comando maestro activado. Despachando *"\${tema || 'el tema indicado'}"* a TGP Alternative.\`;
      } else {
        const analisis = await parsearIntencionMulticanal(rawText);
        esPublicacion = analisis.esPublicacion;
        tema = analisis.tema;
        destinos = Array.isArray(analisis.destinos) ? analisis.destinos : [];
        respuestaChat = analisis.tonoCompagnon || 'Acá estoy, Xavier. ¿Por qué anomalía arrancamos hoy?';
      }

      `;

code = code.substring(0, idxStart) + replacement + code.substring(idxEnd);
fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ index.js actualizado limpiamente con Dialogflow CX multi-turn y Cards V2');
