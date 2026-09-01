// src/config/tgp-tools.ts
// Matriz de Enrutamiento TGP — Un único punto de verdad para todas las URLs de motor.

// ─── URLs de Motor (inyectadas desde variables de entorno) ──────────────────
export const TGP_MOTORES = {
  /** El herrero: Transmutación a WebP, inserción en D1 y guardado en R2 */
  vault:  import.meta.env.PUBLIC_VAULT_WEBHOOK_URL  as string | undefined,
  /** El explorador: Extracción de Wikimedia y scraping de sitios externos */
  proxy:  import.meta.env.PUBLIC_PROXY_URL          as string | undefined,
  /** El autómata: Análisis, generación de texto y flujos cognitivos (Gemini/Vertex) */
  mind:   import.meta.env.PUBLIC_IA_WEBHOOK_URL     as string | undefined,
} as const;

// ─── Definición de Modos de Operación ──────────────────────────────────────
export interface ModoOperacion {
  id:      string;
  label:   string;
  desc:    string;
  motor:   keyof typeof TGP_MOTORES;
  files:   boolean;
  texto:   boolean;
  busqueda: boolean;
}

export const MODOS_OPERACION: ModoOperacion[] = [
  {
    id: 'historico', label: 'Bóveda D1',
    desc: 'Ingesta completa: Imagen + Texto histórico → D1 + R2',
    motor: 'vault', files: true, texto: true, busqueda: false,
  },
  {
    id: 'scriptorium', label: 'Scriptorium',
    desc: 'Editor editorial enriquecido · TipTap + Metadatos + WebP',
    motor: 'vault', files: false, texto: false, busqueda: false,
  },
  {
    id: 'solo_imagen', label: 'Forja WebP',
    desc: 'Comprimir imagen a R2 sin registro en base de datos',
    motor: 'vault', files: true, texto: false, busqueda: false,
  },
  {
    id: 'solo_texto', label: 'Limpieza HTML',
    desc: 'Procesar texto legado o HTML sin medios visuales',
    motor: 'vault', files: false, texto: true, busqueda: false,
  },
  {
    id: 'wikiforge', label: 'WikiForge',
    desc: 'Explorar Wikimedia y extraer entidades vía Proxy',
    motor: 'proxy', files: false, texto: false, busqueda: true,
  },
  {
    id: 'cognitivo', label: 'TGP Mind',
    desc: 'Análisis de artefactos vía Inteligencia Artificial (Gemini/Vertex)',
    motor: 'mind', files: true, texto: true, busqueda: false,
  },
];
