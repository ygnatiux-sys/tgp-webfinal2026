<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let initialEnsayos: any[] = [];
  export let initialD1Items: any[] = [];

  // Pestaña activa: 'all' | 'magazine' | 'ensayos' | 'd1'
  let activeTab: 'all' | 'magazine' | 'ensayos' | 'd1' = 'all';
  let searchQuery = '';
  let loadingD1 = false;
  let selectedArtifact: any = null;

  // ─── EDICIONES MAGAZINE (Revistas Inmersivas 60/40) ──────────────────────────
  let magazines = [
    {
      id: 'gobekli-tepe',
      slug: 'gobekli-tepe',
      url: '/magazine/gobekli-tepe',
      title: 'Göbekli Tepe',
      subtitle: 'El santuario antes del tiempo',
      excerpt: 'Doce mil años antes de los primeros faraones, manos anónimas esculpieron pilares de caliza de seis toneladas en las colinas de Anatolia. La evidencia de que la religión antecede a la agricultura.',
      heroUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792044290145-53f05a9f.webp',
      category: 'Arqueología Cognitiva',
      date: '3 sept 2026',
      folios: 3,
      isFresh: false,
    },
    {
      id: 'pompeya-vesubio',
      slug: 'pompeya',
      url: '/magazine/pompeya',
      title: 'Pompeya y el Vesubio',
      subtitle: 'La paradoja de la piedra y la eternidad',
      excerpt: 'Bajo el manto de cenizas del 79 d.C., una civilización quedó petrificada en un diálogo suspendido entre la fragilidad humana y la fuerza geológica.',
      heroUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/magazine/pompeya-y-el-vesubio/vesuvius-from-pompeii-hires-version-2png.webp',
      category: 'Catástrofe & Memoria',
      date: '3 sept 2026',
      folios: 3,
      isFresh: false,
    },
    {
      id: 'biblioteca-alejandria',
      slug: 'biblioteca-alejandria',
      url: '/magazine/biblioteca-alejandria',
      title: 'La Biblioteca de Alejandría',
      subtitle: 'El sueño del conocimiento universal',
      excerpt: 'El intento más ambicioso de la antigüedad por concentrar todo el saber del mundo conocido en un solo espacio sagrado de papiros y filosofía.',
      heroUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792044852021-861c97cb.webp',
      category: 'Historia del Pensamiento',
      date: 'Agosto 2026',
      folios: 3,
      isFresh: false,
    }
  ];

  // ─── ENSAYOS & ARTÍCULOS EDITORIALES ───────────────────────────────────────
  let rawEnsayos = initialEnsayos.length > 0 
    ? initialEnsayos 
    : initialD1Items.filter(item => item.source === 'ensayo');

  let ensayos = rawEnsayos.map(e => ({
    ...e,
    url: e.url || `/ensayos/${e.id}`
  }));

  // ─── REGISTROS D1 / ARTEFACTOS R2 ──────────────────────────────────────────
  let d1Items = initialD1Items.filter(item => item.source !== 'ensayo').length > 0 
    ? initialD1Items.filter(item => item.source !== 'ensayo') 
    : [
    {
      id: 'vault-recinto-c',
      title: 'Monolito Antropomorfo Recinto C',
      description: 'Pilar calizo de 5 metros con relieve dorsal y cinturón ceremonial. Transmutado a WebP y preservado en Cloudflare R2.',
      category: 'Bóveda D1 · Artefacto',
      imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792044290145-53f05a9f.webp',
      date: '3 sept 2026',
      tags: ['megalitismo', 'anatolia', 'webp'],
      source: 'd1'
    },
    {
      id: 'vault-vesubio-vista',
      title: 'Vesubio desde el Foro de Pompeya',
      description: 'Registro estratigráfico y fotográfico de alta resolución. Forjado en Cloudflare R2 desde Wikimedia Commons.',
      category: 'Bóveda D1 · Artefacto',
      imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/magazine/pompeya-y-el-vesubio/vesuvius-from-pompeii-hires-version-2png.webp',
      date: '3 sept 2026',
      tags: ['pompeya', 'vulcanologia', 'r2'],
      source: 'd1'
    },
    {
      id: 'vault-leopardo-pilar',
      title: 'Relieve Zoomorfo del Leopardo',
      description: 'Pilar con grabado zoomorfo de leopardo y relieves de fauna pleistocénica. Indexado en D1.',
      category: 'Bóveda D1 · Artefacto',
      imageUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/1792044288450-2fe181a6.webp',
      date: '3 sept 2026',
      tags: ['simbolismo', 'chamanismo'],
      source: 'd1'
    }
  ];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && selectedArtifact) {
      selectedArtifact = null;
    }
  }

  onMount(async () => {
    window.addEventListener('keydown', handleKeyDown);

    // 1. Cargar el historial completo de Revistas/Magazines forjados en localStorage
    try {
      let history: any[] = [];
      const rawHistory = localStorage.getItem('tgp_magazines_history');
      if (rawHistory) {
        try {
          const parsed = JSON.parse(rawHistory);
          if (Array.isArray(parsed)) history = parsed;
        } catch {}
      }

      // Migrar borradores antiguos si existían para que no se pierdan
      const legacyDraft = localStorage.getItem('tgp_magazine_draft_id') || localStorage.getItem('tgp_magazine_draft');
      if (legacyDraft) {
        try {
          const lObj = JSON.parse(legacyDraft);
          if (lObj && lObj.titulo && !history.some(h => h.title === lObj.titulo)) {
            const legId = 'legado-' + Date.now().toString().slice(-4);
            const migrated = {
              id: legId,
              slug: legId,
              url: `/magazine/viewer?id=${legId}`,
              title: lObj.titulo,
              subtitle: lObj.subtitulo || 'Edición Forjada por TGP Mind',
              excerpt: lObj.excerpt || '',
              heroUrl: lObj.heroUrl || (lObj.galeria?.slider?.[0]?.url) || 'https://storage.thegreatpuzzleproject.com/vault-media/1792044290145-53f05a9f.webp',
              category: lObj.category || 'TGP Mind · En Vivo',
              date: lObj.date || 'Reciente',
              folios: (lObj.galeria?.slider?.length || 0) + 1,
              isFresh: true,
              data: lObj,
            };
            history.push(migrated);
            localStorage.setItem(`tgp_magazine_${legId}`, JSON.stringify(lObj));
            localStorage.setItem('tgp_magazines_history', JSON.stringify(history));
          }
        } catch {}
      }

      // Incorporar todas las ediciones forjadas al listado general (todas con isFresh: true)
      if (history.length > 0) {
        const mappedHistory = history.map(item => ({
          ...item,
          url: item.url || `/magazine/viewer?id=${item.id}`,
          isFresh: true, // Todas las del historial activas
        }));

        // Evitar duplicados con las revistas base fijas
        const uniqueHistory = mappedHistory.filter(h => !magazines.some(m => m.id === h.id || m.title === h.title));
        magazines = [...uniqueHistory, ...magazines];
      }
    } catch (e) {
      console.warn('[ArchivoHub] Error leyendo historial persistente en localStorage:', e);
    }

    // 2. Consultar registros en vivo de D1
    try {
      loadingD1 = true;
      const resp = await fetch('https://tgp-vault-run-713934653057.us-central1.run.app/entries').catch(() => null);
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.entries) && data.entries.length > 0) {
          const mapped = data.entries.map((item: any) => ({
            id: item.id || String(Math.random()),
            title: item.title || item.titulo || 'Artefacto de Bóveda',
            description: item.description || item.contenido_html || '',
            category: 'Bóveda D1 · R2',
            imageUrl: item.image_url || item.imageUrl,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : 'Reciente',
            tags: typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : (item.tags || []),
            source: 'd1'
          }));
          d1Items = [...mapped, ...d1Items.filter(d => !mapped.some((m: any) => m.id === d.id))];
        }
      }
    } catch (e) {
      console.warn('[ArchivoHub] D1 live fetch error:', e);
    } finally {
      loadingD1 = false;
    }

    // Inicializar Push GSAP para los Bento Cinemascope y Botones Espejo Pulido
    initGsapCinemascope();
  });

  // ─── DICCIONARIO & MOTOR DE HOOKS INTELIGENTES DARK ACADEMIA ────────────────
  interface IntelligentHook {
    phrase: string;
    category: 'provocacion' | 'paradoja' | 'evidencia' | 'enigma';
    emphasisColor: string;
  }

  const HOOK_CATALOG: Record<string, IntelligentHook> = {
    // ── Revistas / Magazines Inmersivas ──
    'gobekli-tepe': {
      phrase: '¿Por qué la humanidad aprendió a rezar antes de aprender a cultivar?',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'pompeya': {
      phrase: 'Pompeya: La ciudad que no quiso morir antes de volverse inmortal',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'pompeya-vesubio': {
      phrase: 'Pompeya: La ciudad que no quiso morir antes de volverse inmortal',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'biblioteca-alejandria': {
      phrase: 'Cuando el fuego devoró el pensamiento: el alto precio de recordar',
      category: 'provocacion',
      emphasisColor: 'text-vault-accent'
    },
    'la-biblioteca-de-alejandria': {
      phrase: 'Cuando el fuego devoró el pensamiento: el alto precio de recordar',
      category: 'provocacion',
      emphasisColor: 'text-vault-accent'
    },

    // ── Ensayos Editoriales & Artículos Históricos ──
    'uxmal': {
      phrase: 'Uxmal: La sinfonía pétrea del estilo Puuc que desafió la sequía del Clásico Maya',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'borrador-ia-2026-08-18t07-00-15': {
      phrase: 'Uxmal: La sinfonía pétrea del estilo Puuc que desafió la sequía del Clásico Maya',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'amazonia': {
      phrase: 'La memoria hídrica del Amazonas: geoglifos de agua y la cicatriz del Antropoceno',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'borrador-ia-visual-2026-08-18t05-24-50': {
      phrase: 'La memoria hídrica del Amazonas: geoglifos de agua y la cicatriz del Antropoceno',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'bonampak': {
      phrase: 'Muros pintados en la penumbra: el códice dinástico que la selva no logró devorar',
      category: 'evidencia',
      emphasisColor: 'text-vault-accent'
    },
    'borrador-ia-visual-2026-08-18t07-48-40': {
      phrase: 'Muros pintados en la penumbra: el códice dinástico que la selva no logró devorar',
      category: 'evidencia',
      emphasisColor: 'text-vault-accent'
    },
    'frescos-pompeya': {
      phrase: 'El rojo pompeyano y la ceniza: cuando el arte doméstico burló al Vesubio',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'borrador-ia-visual-2026-08-18t09-16-08': {
      phrase: 'El rojo pompeyano y la ceniza: cuando el arte doméstico burló al Vesubio',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'priapo-pompeya': {
      phrase: 'El dios del umbral: protección fálica, rito apotropaico y abundancia en Roma',
      category: 'evidencia',
      emphasisColor: 'text-vault-accent'
    },
    'r007-borrador-visual-2026-08-18t10-23-17': {
      phrase: 'El dios del umbral: protección fálica, rito apotropaico y abundancia en Roma',
      category: 'evidencia',
      emphasisColor: 'text-vault-accent'
    },
    'belo-brdo': {
      phrase: 'La civilización sin armas que escribió antes que los sumerios',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'el-tel-y-la-sombra-belo-brdo': {
      phrase: 'La civilización sin armas que escribió antes que los sumerios',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'saqqara': {
      phrase: 'Imhotep y la escalera cósmica: cuando el hombre petrificó la eternidad',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'la-piramide-escalonada-de-saqqara-y-los-origenes-de-la-arquitectura-monumental-de-imhotep': {
      phrase: 'Imhotep y la escalera cósmica: cuando el hombre petrificó la eternidad',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'dahshur': {
      phrase: 'La primera pirámide verdadera: la conquista del ángulo perfecto en el desierto',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'piramide-roja-dahshur': {
      phrase: 'La primera pirámide verdadera: la conquista del ángulo perfecto en el desierto',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'the-caterpillar': {
      phrase: 'La nave biológica de Teseo: ¿sobrevive la memoria cuando el cuerpo se licúa?',
      category: 'paradoja',
      emphasisColor: 'text-vault-accent'
    },
    'younger-dryas': {
      phrase: 'El cataclismo de doce horas que reinició la prehistoria humana',
      category: 'evidencia',
      emphasisColor: 'text-vault-accent'
    },
    'tartessos': {
      phrase: 'La metrópoli de plata que Roma juró borrar de los mapas',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },

    // ── Bóveda Cloudflare D1 / R2 ──
    'vault-recinto-c': {
      phrase: 'Cinco metros de caliza mirando al vacío: el rostro prohibido de Anatolia',
      category: 'enigma',
      emphasisColor: 'text-vault-success'
    },
    'vault-vesubio-vista': {
      phrase: 'La última mañana de Pompeya: cuando el cielo amaneció de piedra',
      category: 'paradoja',
      emphasisColor: 'text-vault-success'
    },
    'vault-leopardo-pilar': {
      phrase: 'La fiera y el chamán: el primer pacto biológico esculpido en piedra',
      category: 'evidencia',
      emphasisColor: 'text-vault-success'
    }
  };

  function cleanTitleForHook(raw?: string): string {
    if (!raw) return 'este vestigio';
    let t = raw
      .replace(/^borrador(-ia)?(-visual)?[\d\w\-_]*/gi, '')
      .replace(/^r\d+-borrador[\d\w\-_]*/gi, '')
      .replace(/\bborrador\b/gi, '')
      .replace(/\b\d{4}-\d{2}-\d{2}[tT\d\-:]*\b/gi, '')
      .trim();
    return t || 'este vestigio';
  }

  function getIntelligentHook(item: { id?: string; slug?: string; title?: string; category?: string; volanta?: string }): IntelligentHook {
    const key = (item.slug || item.id || '').toLowerCase();
    if (HOOK_CATALOG[key]) return HOOK_CATALOG[key];

    const titleLower = (item.title || '').toLowerCase();
    for (const [k, hook] of Object.entries(HOOK_CATALOG)) {
      const cleanK = k.replace(/^vault-/, '').replace(/-/g, ' ');
      if (titleLower.includes(cleanK) || (cleanK.length > 4 && cleanK.includes(titleLower))) {
        return hook;
      }
    }

    // Heurísticas contextuales Dark Academia
    if (titleLower.includes('uxmal') || titleLower.includes('puuc')) {
      return HOOK_CATALOG['uxmal'];
    }
    if (titleLower.includes('amazonia') || titleLower.includes('amazonas') || titleLower.includes('antropoceno')) {
      return HOOK_CATALOG['amazonia'];
    }
    if (titleLower.includes('bonampak') || titleLower.includes('lacandona') || titleLower.includes('mural')) {
      return HOOK_CATALOG['bonampak'];
    }
    if (titleLower.includes('fresco') && (titleLower.includes('pompeya') || titleLower.includes('vesubio'))) {
      return HOOK_CATALOG['frescos-pompeya'];
    }
    if (titleLower.includes('priapo') || titleLower.includes('príapo')) {
      return HOOK_CATALOG['priapo-pompeya'];
    }
    if (titleLower.includes('pompeya') || titleLower.includes('vesubio')) {
      return HOOK_CATALOG['pompeya'];
    }
    if (titleLower.includes('gobekli') || titleLower.includes('tepe') || titleLower.includes('anatolia')) {
      return HOOK_CATALOG['gobekli-tepe'];
    }
    if (titleLower.includes('alejandria') || titleLower.includes('alejandría') || titleLower.includes('biblioteca')) {
      return HOOK_CATALOG['biblioteca-alejandria'];
    }
    if (titleLower.includes('saqqara') || titleLower.includes('imhotep')) {
      return HOOK_CATALOG['saqqara'];
    }
    if (titleLower.includes('dahshur') || titleLower.includes('pirámide roja') || titleLower.includes('piramide roja')) {
      return HOOK_CATALOG['dahshur'];
    }
    if (titleLower.includes('caterpillar') || titleLower.includes('oruga') || titleLower.includes('metamorfosis')) {
      return HOOK_CATALOG['the-caterpillar'];
    }
    if (titleLower.includes('dryas') || titleLower.includes('cometa') || titleLower.includes('impacto')) {
      return HOOK_CATALOG['younger-dryas'];
    }
    if (titleLower.includes('belo') || titleLower.includes('vinca') || titleLower.includes('vinča') || titleLower.includes('danubio')) {
      return HOOK_CATALOG['belo-brdo'];
    }
    if (titleLower.includes('piramid') || titleLower.includes('egipto') || titleLower.includes('giza')) {
      return {
        phrase: 'La geometría que desafió la entropía: cuando el desierto calculó el infinito',
        category: 'enigma',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('tartessos') || titleLower.includes('atlantida') || titleLower.includes('plata')) {
      return HOOK_CATALOG['tartessos'];
    }
    if (item.category && item.category.toLowerCase().includes('d1')) {
      return {
        phrase: 'Evidencia estratigráfica: el testigo pétreo que la cronología oficial ignoró',
        category: 'evidencia',
        emphasisColor: 'text-vault-success'
      };
    }

    const cleanName = cleanTitleForHook(item.title);
    return {
      phrase: `¿Y si el relato oficial sobre ${cleanName} empezó con la premisa invertida?`,
      category: 'provocacion',
      emphasisColor: 'text-vault-accent'
    };
  }

  async function initGsapCinemascope() {
    if (typeof window === 'undefined') return;
    try {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      setTimeout(() => {
        // Limpiar triggers previos de tarjetas cinemascope para evitar colisiones
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.vars && trigger.vars.trigger && (trigger.vars.trigger as HTMLElement).classList?.contains('cinemascope-card')) {
            trigger.kill();
          }
        });

        const cards = document.querySelectorAll<HTMLElement>('.cinemascope-card');
        
        cards.forEach((card) => {
          card.style.opacity = '1';
          card.style.visibility = 'visible';

          const meta = card.querySelector<HTMLElement>('.cinemascope-meta');
          const title = card.querySelector<HTMLElement>('.cinemascope-title');
          const logline = card.querySelector<HTMLElement>('.cinemascope-logline');
          const btn = card.querySelector<HTMLElement>('.cinema-action-btn');

          // Crear timeline individual por tarjeta con ScrollTrigger
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              once: true,
            }
          });

          // SECUENCIA CINEMATOGRÁFICA MINIMALISTA (< 1.6s TOTAL):
          // 1. Telemetría superior discreta (0s - 0.45s)
          if (meta) {
            tl.fromTo(
              meta,
              { opacity: 0, y: -8 },
              { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
            );
          }

          // 2. Título principal Bodoni Extra Bold (~0.2s - 0.85s)
          if (title) {
            tl.fromTo(
              title,
              { opacity: 0, y: 20, letterSpacing: '-0.03em' },
              { opacity: 1, y: 0, letterSpacing: '-0.015em', duration: 0.65, ease: 'power3.out' },
              '-=0.25'
            );
          }

          // 3. Logline cinematográfico de autor (~0.6s - 1.1s)
          if (logline) {
            tl.fromTo(
              logline,
              { opacity: 0, y: 12 },
              { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
              '-=0.3'
            );
          }

          // 4. Botón de cristal interactivo (~0.9s - 1.4s)
          if (btn) {
            tl.fromTo(
              btn,
              { opacity: 0, y: 10, scale: 0.96 },
              { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.3)' },
              '-=0.25'
            );
          }
        });

        // Recalcular ScrollTrigger para sincronizar la altura dinámica
        ScrollTrigger.refresh();
      }, 120);
    } catch (e) {
      console.warn('[ArchivoHub] GSAP note:', e);
    }
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });

  // Filtrado reactivo
  $: filteredMagazines = magazines.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (m.title || '').toLowerCase().includes(q) || 
           (m.subtitle || '').toLowerCase().includes(q) || 
           (m.excerpt || '').toLowerCase().includes(q);
  });

  $: filteredEnsayos = ensayos.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (e.title || '').toLowerCase().includes(q) || 
           (e.description || '').toLowerCase().includes(q) || 
           (e.volanta || '').toLowerCase().includes(q) ||
           (e.category || '').toLowerCase().includes(q) ||
           (e.tags || []).some((t: string) => t.toLowerCase().includes(q));
  });

  $: filteredD1 = d1Items.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (d.title || '').toLowerCase().includes(q) || 
           (d.description || '').toLowerCase().includes(q) ||
           (d.category || '').toLowerCase().includes(q) ||
           (d.tags || []).some((t: string) => t.toLowerCase().includes(q));
  });

  $: totalItemsCount = filteredMagazines.length + filteredEnsayos.length + filteredD1.length;

  // Reactivar GSAP cada vez que se cambia de pestaña o se realiza una búsqueda
  $: if (typeof window !== 'undefined' && (activeTab || searchQuery !== undefined)) {
    initGsapCinemascope();
  }
</script>

<div class="w-full max-w-7xl mx-auto font-inter text-left">

  <!-- ── BARRA DE SOLAPAS Y BUSCADOR (DISEÑO EDITORIAL OBSIDIAN) ── -->
  <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 border-b border-white/10 pb-8">
    
    <!-- Selector de Solapas -->
    <div class="flex flex-wrap items-center gap-2 sm:gap-3" role="tablist" aria-label="Secciones del Archivo">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'all'}
        on:click={() => activeTab = 'all'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'all'
                 ? 'border-vault-accent bg-vault-accent/20 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.3)] font-bold'
                 : 'border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5'}"
      >
        <span>Todos</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/90">{totalItemsCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'magazine'}
        on:click={() => activeTab = 'magazine'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'magazine'
                 ? 'border-vault-accent bg-vault-accent/20 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.3)] font-bold'
                 : 'border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5'}"
      >
        <span>✦ Magazines</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-vault-accent/25 text-vault-accent font-semibold">{filteredMagazines.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'ensayos'}
        on:click={() => activeTab = 'ensayos'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'ensayos'
                 ? 'border-vault-accent bg-vault-accent/20 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.3)] font-bold'
                 : 'border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5'}"
      >
        <span>✎ Ensayos & Artículos</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-vault-accent/25 text-vault-accent font-semibold">{filteredEnsayos.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'd1'}
        on:click={() => activeTab = 'd1'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'd1'
                 ? 'border-vault-accent bg-vault-accent/20 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.3)] font-bold'
                 : 'border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5'}"
      >
        <span>◈ Bóveda D1 / R2</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/90">{filteredD1.length}</span>
      </button>
    </div>

    <!-- Buscador en tiempo real iluminado con glassmorphism -->
    <div class="w-full md:w-72 relative">
      <input
        type="text"
        placeholder="Buscar en el archivo…"
        bind:value={searchQuery}
        class="w-full bg-white/5 border border-white/15 focus:border-vault-accent text-xs font-inter text-white px-4 py-2.5 rounded-full outline-none transition-all placeholder:text-white/45 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      />
      {#if searchQuery}
        <button
          type="button"
          on:click={() => searchQuery = ''}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white cursor-pointer"
          aria-label="Borrar búsqueda"
        >
          ✕
        </button>
      {/if}
    </div>

  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECCIÓN 1: EDICIONES MAGAZINE (Revistas Inmersivas 60/40)
  ═══════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'all' || activeTab === 'magazine'}
    <div class="mb-20">
      
      <div class="flex items-center justify-between mb-8">
        <div>
          <div class="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-vault-accent">
            <span class="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse"></span>
            Revistas Inmersivas · Standalone HTML
          </div>
          <h2 class="font-bodoni text-3xl md:text-4xl text-highlight font-bold mt-1">
            Ediciones <span class="italic text-vault-accent font-light">Magazine</span>
          </h2>
        </div>

        <span class="text-[11px] font-mono text-primary/40 uppercase tracking-widest hidden sm:inline-block">
          Pantalla completa 60/40 · Abre en su propio HTML
        </span>
      </div>

      {#if filteredMagazines.length > 0}
        <div class="flex flex-col gap-12 sm:gap-16 lg:gap-20 w-full">
          {#each filteredMagazines as mag, idx}
            {@const hook = getIntelligentHook(mag)}
            <!-- ── CARD CINEMASCOPE MINIMAL (MUBI × APPLE TV) ── -->
            <article
              id={`cinemascope-card-${idx}`}
              class="cinemascope-card relative isolate w-full min-h-125 sm:min-h-140 lg:min-h-150 lg:aspect-19/10 rounded-3xl sm:rounded-4xl overflow-hidden bg-[#151822] border border-white/15 hover:border-vault-accent/40 shadow-[0_20px_60px_rgba(0,0,0,0.65)] transition-all duration-700 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 group/cinemascope text-left select-none opacity-100 visible"
            >
              <!-- 1. Fondo Cinemático Panorámico con Gradiente Atmosférico Inferior Suave -->
              <div class="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={mag.heroUrl}
                  alt={mag.title}
                  class="w-full h-full object-cover object-[center_22%] filter brightness-[1.03] contrast-[1.02] transition-transform duration-1000 ease-out group-hover/cinemascope:scale-105 will-change-transform tgp-img-protected"
                  loading={idx === 0 ? "eager" : "lazy"}
                />

                <!-- Degradado cinematográfico aireado: solo oscurece la zona de lectura inferior -->
                <div class="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none"></div>

                <!-- Marco perimetral sutil -->
                <div class="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-3xl sm:rounded-4xl pointer-events-none"></div>
              </div>

              <!-- 2. Telemetría Superior MUBI (Sin Cápsulas Ni Emojis) -->
              <div class="cinemascope-meta z-10 flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono tracking-[0.3em] uppercase text-white/75">
                <span class="flex items-center gap-2">
                  <span class="text-vault-accent font-semibold">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                  <span>·</span>
                  <span class="text-white/90">{mag.category}</span>
                  {#if mag.folios}
                    <span class="hidden sm:inline text-white/60">· {mag.folios} Folios</span>
                  {/if}
                </span>

                <span class="text-white/60 tracking-widest">{mag.date}</span>
              </div>

              <!-- 3. Contenido Inferior Anclado: Título Extra Bold Monumental > Logline > Botón de Cristal -->
              <div class="cinemascope-content z-10 mt-auto pt-16 max-w-4xl flex flex-col items-start gap-4">
                
                <!-- TÍTULO EN EXTRA BOLD MONUMENTAL -->
                <h3 class="cinemascope-title font-bodoni font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[0.98] tracking-tight group-hover/cinemascope:text-white/90 transition-colors [text-shadow:0_4px_24px_rgba(0,0,0,0.98)]">
                  {mag.title}
                </h3>

                <!-- LOGLINE CINEMÁTICO DE AUTOR (UNA SOLA LÍNEA POÉTICA) -->
                <p class="cinemascope-logline font-bodoni italic text-base sm:text-lg md:text-xl text-[#ded8cf] max-w-2xl leading-relaxed tracking-wide [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
                  {hook.phrase}
                </p>

                <!-- BOTÓN DE CRISTAL APPLE / MUBI -->
                <div class="pt-2">
                  <a
                    href={mag.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cinema-action-btn inline-flex items-center gap-3 px-7 sm:px-8 py-3.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white backdrop-blur-md text-xs font-mono tracking-[0.25em] uppercase font-bold transition-all duration-300 group/btn cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Abrir Magazine</span>
                    <span class="text-sm transition-transform duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-0.5">↗</span>
                  </a>
                </div>

              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="p-12 rounded-3xl border border-white/5 bg-white/2 text-center text-primary/50 text-xs font-mono">
          No se encontraron ediciones magazine para "{searchQuery}".
        </div>
      {/if}

    </div>
  {/if}

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECCIÓN 2: ENSAYOS & ARTÍCULOS EDITORIALES (Colección MDX Completa)
  ═══════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'all' || activeTab === 'ensayos'}
    <div class="mb-20">
      
      <div class="flex items-center justify-between mb-8">
        <div>
          <div class="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-vault-accent">
            <span class="w-1.5 h-1.5 rounded-full bg-vault-accent"></span>
            Investigación & Crítica · Colección Editorial
          </div>
          <h2 class="font-bodoni text-3xl md:text-4xl text-highlight font-bold mt-1">
            Artículos & <span class="italic text-vault-accent font-light">Ensayos</span>
          </h2>
        </div>

        <span class="text-[11px] font-mono text-primary/40 uppercase tracking-widest hidden sm:inline-block">
          Lectura integral con visor editorial
        </span>
      </div>

      {#if filteredEnsayos.length > 0}
        <div class="flex flex-col gap-12 sm:gap-16 lg:gap-20 w-full">
          {#each filteredEnsayos as ensayo, idx}
            {@const hook = getIntelligentHook(ensayo)}
            <!-- ── CARD CINEMASCOPE MINIMAL ENSAYOS (MUBI × APPLE TV) ── -->
            <article
              id={`cinemascope-ensayo-${idx}`}
              class="cinemascope-card relative isolate w-full min-h-125 sm:min-h-140 lg:min-h-150 lg:aspect-19/10 rounded-3xl sm:rounded-4xl overflow-hidden bg-[#151822] border border-white/15 hover:border-vault-accent/40 shadow-[0_20px_60px_rgba(0,0,0,0.65)] transition-all duration-700 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 group/cinemascope text-left select-none opacity-100 visible"
            >
              <!-- 1. Fondo Cinemático Panorámico con Gradiente Atmosférico Inferior Suave -->
              <div class="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={ensayo.imageUrl}
                  alt={ensayo.title}
                  class="w-full h-full object-cover object-[center_22%] filter brightness-[1.03] contrast-[1.02] transition-transform duration-1000 ease-out group-hover/cinemascope:scale-105 will-change-transform tgp-img-protected"
                  loading="lazy"
                />

                <!-- Degradado cinematográfico aireado: solo oscurece la zona de lectura inferior -->
                <div class="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none"></div>

                <!-- Marco perimetral sutil -->
                <div class="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-3xl sm:rounded-4xl pointer-events-none"></div>
              </div>

              <!-- 2. Telemetría Superior MUBI (Sin Cápsulas Ni Emojis) -->
              <div class="cinemascope-meta z-10 flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono tracking-[0.3em] uppercase text-white/75">
                <span class="flex items-center gap-2">
                  <span class="text-vault-accent font-semibold">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                  <span>·</span>
                  <span class="text-white/90">{ensayo.category}</span>
                </span>

                <span class="text-white/60 tracking-widest">{ensayo.date}</span>
              </div>

              <!-- 3. Contenido Inferior Anclado: Título Extra Bold Monumental > Logline > Botón de Cristal -->
              <div class="cinemascope-content z-10 mt-auto pt-16 max-w-4xl flex flex-col items-start gap-4">
                
                <!-- TÍTULO EN EXTRA BOLD MONUMENTAL -->
                <h3 class="cinemascope-title font-bodoni font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[0.98] tracking-tight group-hover/cinemascope:text-white/90 transition-colors [text-shadow:0_4px_24px_rgba(0,0,0,0.98)]">
                  {ensayo.title}
                </h3>

                <!-- LOGLINE CINEMÁTICO DE AUTOR (UNA SOLA LÍNEA POÉTICA) -->
                <p class="cinemascope-logline font-bodoni italic text-base sm:text-lg md:text-xl text-[#ded8cf] max-w-2xl leading-relaxed tracking-wide [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
                  {hook.phrase}
                </p>

                <!-- BOTÓN DE CRISTAL APPLE / MUBI -->
                <div class="pt-2">
                  <a
                    href={ensayo.url}
                    class="cinema-action-btn inline-flex items-center gap-3 px-7 sm:px-8 py-3.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white backdrop-blur-md text-xs font-mono tracking-[0.25em] uppercase font-bold transition-all duration-300 group/btn cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Leer Ensayo</span>
                    <span class="text-sm transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                  </a>
                </div>

              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="p-12 rounded-3xl border border-white/5 bg-white/2 text-center text-primary/50 text-xs font-mono">
          No se encontraron ensayos para "{searchQuery}".
        </div>
      {/if}

    </div>
  {/if}

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECCIÓN 3: BÓVEDA D1 & ARTEFACTOS R2
  ═══════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'all' || activeTab === 'd1'}
    <div class="mt-8 mb-16">
      
      <div class="flex items-center justify-between mb-8">
        <div>
          <div class="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-vault-success">
            <span class="w-1.5 h-1.5 rounded-full bg-vault-success"></span>
            Cloudflare D1 Database & R2 Storage
          </div>
          <h2 class="font-bodoni text-3xl md:text-4xl text-highlight font-bold mt-1">
            Bóveda <span class="italic text-vault-accent font-light">D1 / Artefactos</span>
          </h2>
        </div>

        <a
          href="/tgp-vault"
          class="text-[11px] font-mono text-vault-accent hover:text-highlight tracking-widest uppercase flex items-center gap-1.5 border border-vault-accent/30 px-3.5 py-1.5 rounded-full hover:bg-vault-accent/10 transition-all cursor-pointer"
        >
          <span>◈ Mesa de Forja</span>
          <span>→</span>
        </a>
      </div>

      {#if filteredD1.length > 0}
        <div class="flex flex-col gap-12 sm:gap-16 lg:gap-20 w-full">
          {#each filteredD1 as item, idx}
            {@const hook = getIntelligentHook(item)}
            <!-- ── CARD CINEMASCOPE MINIMAL BÓVEDA D1 (MUBI × APPLE TV) ── -->
            <article
              id={`cinemascope-d1-${idx}`}
              class="cinemascope-card relative isolate w-full min-h-125 sm:min-h-140 lg:min-h-150 lg:aspect-19/10 rounded-3xl sm:rounded-4xl overflow-hidden bg-[#151822] border border-white/15 hover:border-vault-success/40 shadow-[0_20px_60px_rgba(0,0,0,0.65)] transition-all duration-700 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 group/cinemascope text-left select-none opacity-100 visible"
            >
              <!-- 1. Fondo Cinemático Panorámico con Gradiente Atmosférico Inferior Suave -->
              <div class="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={item.imageUrl || 'https://storage.thegreatpuzzleproject.com/vault-media/1792044290145-53f05a9f.webp'}
                  alt={item.title}
                  class="w-full h-full object-cover object-[center_22%] filter brightness-[1.03] contrast-[1.02] transition-transform duration-1000 ease-out group-hover/cinemascope:scale-105 will-change-transform tgp-img-protected"
                  loading="lazy"
                />

                <!-- Degradado cinematográfico aireado: solo oscurece la zona de lectura inferior -->
                <div class="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none"></div>

                <!-- Marco perimetral sutil -->
                <div class="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-3xl sm:rounded-4xl pointer-events-none"></div>
              </div>

              <!-- 2. Telemetría Superior MUBI (Sin Cápsulas Ni Emojis) -->
              <div class="cinemascope-meta z-10 flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono tracking-[0.3em] uppercase text-white/75">
                <span class="flex items-center gap-2">
                  <span class="text-vault-success font-semibold">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                  <span>·</span>
                  <span class="text-vault-success/90">{item.category}</span>
                  <span class="hidden sm:inline text-white/40">·</span>
                  <span class="hidden sm:inline text-white/60">BÓVEDA D1 / R2</span>
                </span>

                <span class="text-white/60 tracking-widest">{item.date}</span>
              </div>

              <!-- 3. Contenido Inferior Anclado: Título Extra Bold Monumental > Logline > Botón de Cristal -->
              <div class="cinemascope-content z-10 mt-auto pt-16 max-w-4xl flex flex-col items-start gap-4">
                
                <!-- TÍTULO EN EXTRA BOLD MONUMENTAL -->
                <h3 class="cinemascope-title font-bodoni font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[0.98] tracking-tight group-hover/cinemascope:text-vault-success transition-colors [text-shadow:0_4px_24px_rgba(0,0,0,0.98)]">
                  {item.title}
                </h3>

                <!-- LOGLINE CINEMÁTICO DE AUTOR (UNA SOLA LÍNEA POÉTICA) -->
                <p class="cinemascope-logline font-bodoni italic text-base sm:text-lg md:text-xl text-[#ded8cf] max-w-2xl leading-relaxed tracking-wide [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
                  {hook.phrase}
                </p>

                <!-- BOTÓN DE CRISTAL APPLE / MUBI -->
                <div class="pt-2">
                  <button
                    type="button"
                    on:click={() => selectedArtifact = item}
                    class="cinema-action-btn inline-flex items-center gap-3 px-7 sm:px-8 py-3.5 rounded-full bg-white/10 hover:bg-vault-success text-white hover:text-black border border-white/20 hover:border-vault-success backdrop-blur-md text-xs font-mono tracking-[0.25em] uppercase font-bold transition-all duration-300 group/btn cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(52,211,153,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Inspeccionar Artefacto</span>
                    <span class="text-sm transition-transform duration-300 group-hover/btn:rotate-45">◈</span>
                  </button>
                </div>

              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="p-12 rounded-3xl border border-white/5 bg-white/2 text-center text-primary/50 text-xs font-mono">
          No se encontraron registros de Bóveda D1 para "{searchQuery}".
        </div>
      {/if}

    </div>
  {/if}

</div>

<!-- ═══════════════════════════════════════════════════════════════════════
     MODAL DE INSPECCIÓN DE ARTEFACTO (D1 / R2)
═══════════════════════════════════════════════════════════════════════ -->
{#if selectedArtifact}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl transition-all"
    role="dialog"
    aria-modal="true"
    aria-labelledby="artifact-modal-title"
  >
    <!-- Backdrop click to close -->
    <button
      type="button"
      class="fixed inset-0 w-full h-full cursor-default bg-transparent border-none outline-none -z-10"
      on:click={() => selectedArtifact = null}
      aria-label="Cerrar modal"
    ></button>

    <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bento-glass rounded-3xl border border-vault-accent/40 shadow-2xl p-6 sm:p-8 space-y-6">
      <!-- Botón de cierre superior -->
      <button
        type="button"
        on:click={() => selectedArtifact = null}
        class="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-mono transition-all cursor-pointer"
        aria-label="Cerrar"
      >
        ✕
      </button>

      <!-- Encabezado del artefacto -->
      <div>
        <div class="flex items-center gap-2 text-[10px] font-mono tracking-widest text-vault-accent uppercase mb-2">
          <span>◈ {selectedArtifact.category || 'Registro de Bóveda'}</span>
          <span>•</span>
          <span class="text-primary/50">{selectedArtifact.date}</span>
        </div>
        <h3 id="artifact-modal-title" class="font-bodoni text-2xl sm:text-4xl font-bold text-highlight leading-tight">
          {selectedArtifact.title}
        </h3>
      </div>

      <!-- Imagen en alta resolución -->
      {#if selectedArtifact.imageUrl}
        <div class="w-full h-64 sm:h-96 rounded-2xl overflow-hidden border border-white/10 bg-black/50 relative">
          <img
            src={selectedArtifact.imageUrl}
            alt={selectedArtifact.title}
            class="w-full h-full object-cover"
          />
          <div class="absolute bottom-3 left-3 px-3 py-1 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-mono text-vault-accent uppercase tracking-widest border border-vault-accent/30">
            Almacenamiento Cloudflare R2
          </div>
        </div>
      {/if}

      <!-- Descripción y detalles -->
      <div class="space-y-4">
        <h4 class="text-xs font-mono uppercase tracking-widest text-primary/50">
          Registro Estratigráfico / Síntesis
        </h4>
        <p class="text-sm sm:text-base text-primary/85 leading-relaxed font-light">
          {selectedArtifact.description}
        </p>
      </div>

      <!-- Tags -->
      {#if selectedArtifact.tags && selectedArtifact.tags.length > 0}
        <div class="flex flex-wrap gap-2 pt-4 border-t border-white/10">
          {#each selectedArtifact.tags as tag}
            <span class="px-3 py-1 rounded-full text-xs font-mono bg-white/5 text-vault-accent border border-vault-accent/20">
              #{tag}
            </span>
          {/each}
        </div>
      {/if}

      <!-- Acciones del Modal -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
        <a
          href="/tgp-vault"
          class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-vault-accent text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-highlight transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Abrir en Mesa de Forja</span>
          <span>→</span>
        </a>

        <button
          type="button"
          on:click={() => selectedArtifact = null}
          class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-primary/80 font-mono text-xs uppercase tracking-widest hover:text-highlight hover:bg-white/10 transition-all cursor-pointer"
        >
          Cerrar [ESC]
        </button>
      </div>

    </div>
  </div>
{/if}

<style>
  :global(.cinemascope-card) {
    opacity: 1 !important;
    visibility: visible !important;
  }
</style>
