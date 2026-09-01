// src/keystatic-views/tgpDocumentEditor.ts
// Configuración centralizada y reutilizable del editor de documentos Keystatic (DRY)

import { fields } from '@keystatic/core';
import { tgpComponentBlocks } from './index';

/**
 * Función / Fábrica centralizada para `fields.document` en Keystatic.
 * Integra soporte completo para formato, divisores, tablas, enlaces, imágenes
 * y los Component Blocks (Slash Commands /WikiForge y /TGPMind).
 *
 * @param label - Etiqueta visible del campo en el CMS
 * @param description - Descripción opcional para el redactor
 */
export const tgpDocumentEditor = (
  label: string = 'Contenido del Documento',
  description?: string
) =>
  fields.document({
    label,
    description,
    formatting: {
      alignment: true,
      blockTypes: true,
      headingLevels: [1, 2, 3, 4, 5, 6],
      inlineMarks: {
        bold: true,
        italic: true,
        strikethrough: true,
        code: true,
        underline: true,
        keyboard: true,
        subscript: true,
        superscript: true,
      },
      listTypes: {
        ordered: true,
        unordered: true,
      },
      softBreaks: true,
    },
    dividers: true,
    links: true,
    tables: true,
    images: {
      directory: 'public/images/entries',
      publicPath: '/images/entries/',
    },
    componentBlocks: tgpComponentBlocks,
  });
