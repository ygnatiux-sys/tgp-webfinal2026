/**
 * ══════════════════════════════════════════════════════════════════════════
 * TGP ASPECT SYSTEM — CONTRATO DE PROPORCIONES CINEMÁTICAS DESACOPLADAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Arquitectura "IMAX Respirable" (82-85dvh + W-96% Max-1540px):
 * - Se libera el aspect-ratio rígido cuando la tarjeta busca inmersión vertical.
 * - Ancho inteligente: w-[96%] max-w-[1540px] (casi al borde, sin ser full bleed).
 * - Altura inmersiva: min-h-[80dvh] md:min-h-[84dvh] con flex-col justify-end.
 * - Punto focal dinámico (top/center/bottom) provisto por focalPointDetector.
 */

export { detectFocalPoint, type FocalPoint, type FocalResolution } from './focalPointDetector';

export interface AspectPreset {
  container: string;
  img: string;
  overlay: string;
  ratioDesktop: string;
  ratioMobile: string;
}

export const POST_ASPECT_RATIOS = {
  /**
   * 1. IMAX MONUMENTAL DESACOPLADO (Estándar 2026 - Pantalla Respirable 84dvh)
   * Uso: Cards principales de historia alternativa, archivo vivo y bentos de gran formato.
   */
  imaxMonumental: {
    container: "w-[96%] max-w-[1540px] min-h-[80dvh] md:min-h-[84dvh] mx-auto rounded-[2.5rem] overflow-hidden flex flex-col justify-end",
    img: "w-full h-full object-cover tgp-img-protected",
    overlay: "bg-linear-to-t from-black/80 via-black/25 via-42% to-transparent pointer-events-none",
    ratioDesktop: "84dvh",
    ratioMobile: "80dvh",
  },

  /**
   * 2. UNIVISIUM MASTER (Franjas panorámicas secundarias)
   */
  univisium: {
    container: "w-full aspect-[4/3] sm:aspect-[2/1] min-h-[440px] md:min-h-[500px]",
    img: "w-full h-full object-cover object-[center_22%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/80 via-black/30 via-45% to-transparent pointer-events-none",
    ratioDesktop: "2:1",
    ratioMobile: "4:3",
  },

  /**
   * 3. BUSTO & MONOLITO (Retina 16:10 para esculturas y retratos)
   */
  monumental: {
    container: "w-full aspect-[4/3] sm:aspect-[16/10] min-h-[480px] md:min-h-[560px]",
    img: "w-full h-full object-cover object-[center_16%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/85 via-black/25 via-40% to-transparent pointer-events-none",
    ratioDesktop: "16:10",
    ratioMobile: "4:3",
  },

  /**
   * 4. BENTO COMPACT (Grilla de 2-3 columnas)
   */
  gridCompact: {
    container: "w-full aspect-[16/10] sm:aspect-[19/10] min-h-[340px] md:min-h-[400px]",
    img: "w-full h-full object-cover object-[center_22%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/80 via-black/25 via-50% to-transparent pointer-events-none",
    ratioDesktop: "19:10",
    ratioMobile: "16:10",
  },
} as const;

export type AspectRatioType = keyof typeof POST_ASPECT_RATIOS;

export function getPostAspectClasses(type: AspectRatioType = "imaxMonumental"): AspectPreset {
  return POST_ASPECT_RATIOS[type] || POST_ASPECT_RATIOS.imaxMonumental;
}
