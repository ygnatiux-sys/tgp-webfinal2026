// src/keystatic-views/index.ts
// Exportación centralizada de Component Blocks (Slash Commands) para Keystatic

import { wikiForgeBlock } from './WikiForgeBlock';
import { tgpMindBlock } from './TgpMindBlock';

export { wikiForgeBlock } from './WikiForgeBlock';
export { tgpMindBlock } from './TgpMindBlock';

/**
 * Matriz de Component Blocks para fields.document en Keystatic.
 * Se activan escribiendo '/' dentro del editor de Keystatic.
 */
export const tgpComponentBlocks = {
  wikiforge: wikiForgeBlock,
  tgpmind: tgpMindBlock,
};
