/**
 * ══════════════════════════════════════════════════════════════════════════
 * TGP FOCAL POINT DETECTOR — HEURÍSTICA Y ANCLAJE VISUAL CINEMATOGRÁFICO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Resuelve el problema geométrico de object-cover en proporciones desacopladas (80-85dvh).
 * Detecta si el punto de interés de la obra/fotografía está arriba (rostros, bustos,
 * capiteles, estatuas), en el centro-superior (paisajes, megalitos, horizontes)
 * o abajo (estratigrafías, excavaciones, suelos).
 */

export type FocalPoint = 'top' | 'center-top' | 'center' | 'bottom';

export interface FocalResolution {
  focalPoint: FocalPoint;
  objectPositionClass: string;
  gradientClass: string;
}

/**
 * Catálogo heurístico de términos visuales Dark Academia / Arqueología
 */
const TOP_FOCUS_KEYWORDS = [
  'busto', 'estatua', 'monolito', 'relicario', 'simeon', 'rostro', 'cabeza',
  'antropomorfo', 'sapiens', 'nefertiti', 'priapo', 'fresco', 'dios', 'faraon',
  'escultura', 'perfil', 'moctezuma', 'cortez', 'mascara', 'caterpillar',
  'san agustin', 'nestoriano', 'cristo', 'santo', 'virgen', 'corona', 'torre',
  'piramide roja', 'dahshur', 'obelisco', 'masuda', 'iwafune', 'asuka',
  'pumapunku', 'tiwanaku', 'nan madol', 'longyou', 'cueva'
];

const BOTTOM_FOCUS_KEYWORDS = [
  'estratigrafia', 'excavacion', 'cimiento', 'suelo', 'base', 'piso', 'subterraneo',
  'fosa', 'cripta', 'catacumba', 'sedimento', 'trinchera', 'cantera'
];

const CENTER_FOCUS_KEYWORDS = [
  'valle', 'horizonte', 'panoramica', 'mar', 'costa', 'oceano', 'danubio',
  'vesubio', 'pompeya', 'gobekli', 'dryas', 'cometa', 'impacto', 'cielo',
  'biblioteca', 'alejandria', 'plano', 'mapa', 'piri reis', 'yonaguni', 'submarino', 'terraza'
];

/**
 * Analiza metadatos y devuelve las clases Tailwind de posicionamiento óptimo y gradiente.
 */
export function detectFocalPoint(item: {
  title?: string;
  imageUrl?: string;
  category?: string;
  volanta?: string;
  manualFocus?: FocalPoint;
}): FocalResolution {
  // 1. Respetar anclaje manual explícito si existe
  if (item.manualFocus) {
    return resolveFocalClass(item.manualFocus);
  }

  const query = `${item.title || ''} ${item.imageUrl || ''} ${item.category || ''} ${item.volanta || ''}`.toLowerCase();

  // 2. Heurística Top: bustos, esculturas, rostros y monolitos verticales
  if (TOP_FOCUS_KEYWORDS.some(k => query.includes(k))) {
    return {
      focalPoint: 'top',
      objectPositionClass: 'object-[center_12%] sm:object-[center_16%]',
      gradientClass: 'bg-linear-to-t from-black/85 via-black/25 via-40% to-transparent'
    };
  }

  // 3. Heurística Bottom: estratigrafía, excavaciones y suelos
  if (BOTTOM_FOCUS_KEYWORDS.some(k => query.includes(k))) {
    return {
      focalPoint: 'bottom',
      objectPositionClass: 'object-[center_78%]',
      gradientClass: 'bg-linear-to-t from-black/90 via-black/35 via-48% to-transparent'
    };
  }

  // 4. Heurística Center o Center-Top para paisajes y panorámicas
  if (CENTER_FOCUS_KEYWORDS.some(k => query.includes(k))) {
    return {
      focalPoint: 'center-top',
      objectPositionClass: 'object-[center_28%]',
      gradientClass: 'bg-linear-to-t from-black/80 via-black/20 via-45% to-transparent'
    };
  }

  // 5. Default seguro con protección de coronilla
  return {
    focalPoint: 'center-top',
    objectPositionClass: 'object-[center_22%]',
    gradientClass: 'bg-linear-to-t from-black/80 via-black/25 via-45% to-transparent'
  };
}

function resolveFocalClass(point: FocalPoint): FocalResolution {
  switch (point) {
    case 'top':
      return {
        focalPoint: 'top',
        objectPositionClass: 'object-[center_12%] sm:object-[center_16%]',
        gradientClass: 'bg-linear-to-t from-black/85 via-black/25 via-40% to-transparent'
      };
    case 'bottom':
      return {
        focalPoint: 'bottom',
        objectPositionClass: 'object-[center_78%]',
        gradientClass: 'bg-linear-to-t from-black/90 via-black/35 via-48% to-transparent'
      };
    case 'center':
      return {
        focalPoint: 'center',
        objectPositionClass: 'object-center',
        gradientClass: 'bg-linear-to-t from-black/80 via-black/30 via-45% to-transparent'
      };
    default:
      return {
        focalPoint: 'center-top',
        objectPositionClass: 'object-[center_22%]',
        gradientClass: 'bg-linear-to-t from-black/80 via-black/25 via-45% to-transparent'
      };
  }
}
