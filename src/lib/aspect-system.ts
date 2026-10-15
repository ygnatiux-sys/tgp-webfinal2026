/**
 * ══════════════════════════════════════════════════════════════════════════
 * TGP ASPECT SYSTEM — CONTRATO DE PROPORCIONES CINEMÁTICAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Transición Maestro:
 * - Sacado: 21:9 / 2.39:1 Cinemascope estrecho (cortaba cabezas y achataba figuras).
 * - Adoptado: Univisium (2:1 / 18:9) con adaptación móvil a 4:3.
 * - Variante Monumental: 16:10 para bustos, esculturas, arquetipos y biografía.
 * - Clamps de seguridad: min-h-[420px] / max-h-[76vh].
 * - Protección de encuadre: object-position: center 20%-22% (anclaje de coronilla/ojos).
 */

export interface AspectPreset {
  container: string;
  img: string;
  overlay: string;
  ratioDesktop: string;
  ratioMobile: string;
}

export const POST_ASPECT_RATIOS = {
  /**
   * 1. UNIVISIUM MASTER (Estándar Editorial de Posts y Franjas Anchas)
   * Ratio: 4:3 en mobile (<640px) -> 2:1 en desktop (sm:).
   * Uso: Feed continuo, historia alternativa, crónicas, georreferencias y paisajes.
   */
  univisium: {
    container: "aspect-[4/3] sm:aspect-[2/1] min-h-[420px] md:min-h-[460px] max-h-[76vh]",
    img: "w-full h-full object-cover object-[center_22%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/95 via-black/40 via-45% to-transparent pointer-events-none",
    ratioDesktop: "2:1",
    ratioMobile: "4:3",
  },

  /**
   * 2. BUSTO & MONOLITO MONUMENTAL (Retina Pro 16:10)
   * Ratio: 4:3 en mobile (<640px) -> 16:10 en desktop (sm:).
   * Uso: Arquetipos, bustos clásicos, esculturas, Esfinge de Giza y perfil Xavier Benítez.
   */
  monumental: {
    container: "aspect-[4/3] sm:aspect-[16/10] min-h-[460px] md:min-h-[540px] max-h-[82vh]",
    img: "w-full h-full object-cover object-[center_20%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/95 via-black/35 via-40% to-transparent pointer-events-none",
    ratioDesktop: "16:10",
    ratioMobile: "4:3",
  },

  /**
   * 3. BENTO ULTRA (Hero y Franjas Maestras Panorámicas)
   * Ratio: 4:3 en mobile -> 2:1 en desktop con desahogo vertical generoso.
   * Uso: Hero billboards interactivos, CinematicBentoHero, TriplicoRevelacion.
   */
  bentoUltra: {
    container: "aspect-[4/3] sm:aspect-[2/1] min-h-[440px] md:min-h-[500px] max-h-[76vh]",
    img: "w-full h-full object-cover object-[center_22%] tgp-img-protected will-change-transform",
    overlay: "bg-linear-to-t from-black/95 via-black/45 via-45% to-transparent pointer-events-none",
    ratioDesktop: "2:1",
    ratioMobile: "4:3",
  },

  /**
   * 4. GRILLA COMPACTA / 2 COLUMNAS (MUBI Grid & Bóveda D1)
   * Ratio: 16:10 en mobile -> 19:10 en desktop.
   * Uso: Cards en grilla de 2 columnas o explorador de alta densidad.
   */
  gridCompact: {
    container: "aspect-[16/10] sm:aspect-[19/10] min-h-[340px] md:min-h-[390px] max-h-[60vh]",
    img: "w-full h-full object-cover object-[center_22%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/90 via-black/35 via-50% to-transparent pointer-events-none",
    ratioDesktop: "19:10",
    ratioMobile: "16:10",
  },

  /**
   * 5. COLECCIONES VERTICALES (Stack y Visor de Colecciones)
   * Ratio: 4:3 en mobile -> 2:1 en desktop con min-height de 62vh a 155px.
   */
  collectionsStack: {
    container: "aspect-[4/3] sm:aspect-[2/1] min-h-[62vh] max-h-190",
    img: "w-full h-full object-cover object-[center_22%] tgp-img-protected",
    overlay: "bg-linear-to-t from-black/95 via-black/40 to-transparent pointer-events-none",
    ratioDesktop: "2:1",
    ratioMobile: "4:3",
  },
} as const;

export type AspectRatioType = keyof typeof POST_ASPECT_RATIOS;

/**
 * Helper para obtener las clases CSS de Tailwind asociadas al preset de proporción.
 */
export function getPostAspectClasses(type: AspectRatioType = "univisium"): AspectPreset {
  return POST_ASPECT_RATIOS[type] || POST_ASPECT_RATIOS.univisium;
}
