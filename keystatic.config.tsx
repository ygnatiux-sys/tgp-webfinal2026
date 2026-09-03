// keystatic.config.tsx
// Configuración global de Keystatic CMS con Slash Commands (/WikiForge y /TGPMind)
// Ecosistema The Great Puzzle Project

import { config, fields, collection } from '@keystatic/core';
import { tgpDocumentEditor } from './src/keystatic-views/tgpDocumentEditor';

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: {
      name: 'The Great Puzzle Project',
    },
    navigation: {
      'Colecciones Editoriales': ['ensayos', 'arquetipos', 'cinematicos'],
      'Archivo & Bóveda': ['vault_entries'],
    },
  },
  collections: {
    // ─── 1. Ensayos Históricos y Filosóficos ─────────────────────────────────
    ensayos: collection({
      label: 'Ensayos Históricos',
      slugField: 'title',
      path: 'src/content/ensayos/**',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Título del Ensayo' } }),
        abstract: fields.text({ label: 'Resumen / Abstract', multiline: true }),
        volanta: fields.text({ label: 'Volanta / Epígrafe' }),
        category: fields.text({ label: 'Categoría' }),
        themeColor: fields.text({ label: 'Color de Tema (#HEX)' }),
        date: fields.date({ label: 'Fecha de Publicación' }),
        draft: fields.checkbox({ label: 'Borrador (Draft)', defaultValue: false }),
        powertype: fields.select({
          label: 'Power Type',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Destacado', value: 'featured' },
            { label: 'Manifiesto', value: 'manifesto' },
          ],
          defaultValue: 'standard',
        }),
        layoutMode: fields.select({
          label: 'Modo de Layout',
          options: [
            { label: 'Editorial', value: 'editorial' },
            { label: 'Cinemático', value: 'cinematic' },
            { label: 'Académico', value: 'academic' },
          ],
          defaultValue: 'editorial',
        }),
        content: tgpDocumentEditor(
          'Cuerpo del Ensayo',
          'Escribe con libertad. Usa / para invocar los Slash Commands de WikiForge o TGP Mind.'
        ),
      },
    }),

    // ─── 2. Arquetipos Globales ──────────────────────────────────────────────
    arquetipos: collection({
      label: 'Arquetipos Globales',
      slugField: 'name',
      path: 'src/content/arquetipos/**',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Nombre del Arquetipo' } }),
        era: fields.text({ label: 'Era / Periodo Histórico' }),
        coordenadas: fields.text({ label: 'Coordenadas Geográficas' }),
        coverImage: fields.image({
          label: 'Imagen Representativa',
          directory: 'public/images/arquetipos',
          publicPath: '/images/arquetipos/',
        }),
        content: tgpDocumentEditor('Descripción y Análisis del Arquetipo'),
      },
    }),

    // ─── 3. Ensayos Cinemáticos ──────────────────────────────────────────────
    cinematicos: collection({
      label: 'Ensayos Cinemáticos',
      slugField: 'title',
      path: 'src/content/cinematicos/**',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Título Cinemático' } }),
        videoUrl: fields.url({ label: 'URL de Video / Metraje' }),
        date: fields.date({ label: 'Fecha' }),
        content: tgpDocumentEditor('Guion y Contenido Cinemático'),
      },
    }),

    // ─── 4. Registros de Bóveda / Hemeroteca ─────────────────────────────────
    vault_entries: collection({
      label: 'Registros de la Bóveda',
      slugField: 'title',
      path: 'src/content/vault_entries/**',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Título del Registro' } }),
        era: fields.text({ label: 'Era' }),
        coordenadas: fields.text({ label: 'Coordenadas' }),
        image_url: fields.url({ label: 'URL WebP en Cloudflare R2' }),
        content: tgpDocumentEditor('Transcripción / Contenido del Registro'),
      },
    }),
  },
});
