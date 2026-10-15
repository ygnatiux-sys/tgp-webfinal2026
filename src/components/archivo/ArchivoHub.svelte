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
      heroUrl: '/magazine-hero-gobekli.jpg',
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
      heroUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Ancient_Library_of_Alexandria.jpg/1280px-Ancient_Library_of_Alexandria.jpg',
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
      imageUrl: '/magazine-hero-gobekli.jpg',
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
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/G%C3%B6bekli_Tepe_Birthing_Woman_in_Leopard_Pillar_Building.jpg',
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
              heroUrl: lObj.heroUrl || (lObj.galeria?.slider?.[0]?.url) || '/magazine-hero-gobekli.jpg',
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
    // Magazines
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
    
    // Ensayos Clave
    'younger-dryas': {
      phrase: 'El cataclismo de doce horas que reinició la prehistoria humana',
      category: 'evidencia',
      emphasisColor: 'text-vault-accent'
    },
    'belo-brdo': {
      phrase: 'La civilización sin armas que escribió antes que los sumerios',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },
    'tartessos': {
      phrase: 'La metrópoli de plata que Roma juró borrar de los mapas',
      category: 'enigma',
      emphasisColor: 'text-vault-accent'
    },

    // Artefactos D1 / R2
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
    if (titleLower.includes('pompeya') || titleLower.includes('vesubio')) {
      return {
        phrase: 'Pompeya: La ciudad que no quiso morir antes de volverse inmortal',
        category: 'paradoja',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('gobekli') || titleLower.includes('tepe') || titleLower.includes('anatolia')) {
      return {
        phrase: '¿Por qué la humanidad aprendió a rezar antes de aprender a cultivar?',
        category: 'enigma',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('alejandria') || titleLower.includes('biblioteca')) {
      return {
        phrase: 'Cuando el fuego devoró el pensamiento: el alto precio de recordar',
        category: 'provocacion',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('dryas') || titleLower.includes('cometa') || titleLower.includes('impacto')) {
      return {
        phrase: 'El cataclismo de doce horas que reinició la prehistoria humana',
        category: 'evidencia',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('belo') || titleLower.includes('vinca') || titleLower.includes('danubio')) {
      return {
        phrase: 'La civilización sin armas que escribió antes que los sumerios',
        category: 'enigma',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('piramid') || titleLower.includes('egipto') || titleLower.includes('giza')) {
      return {
        phrase: 'La geometría que desafió la entropía: cuando el desierto calculó el infinito',
        category: 'enigma',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (titleLower.includes('tartessos') || titleLower.includes('atlantida') || titleLower.includes('plata')) {
      return {
        phrase: 'La metrópoli de plata que Roma juró borrar de los mapas',
        category: 'enigma',
        emphasisColor: 'text-vault-accent'
      };
    }
    if (item.category && item.category.toLowerCase().includes('d1')) {
      return {
        phrase: 'Evidencia estratigráfica: el testigo pétreo que la cronología oficial ignoró',
        category: 'evidencia',
        emphasisColor: 'text-vault-success'
      };
    }

    return {
      phrase: `¿Y si el relato oficial sobre ${item.title || 'este vestigio'} empezó con la premisa invertida?`,
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
        const cards = document.querySelectorAll<HTMLElement>('.cinemascope-card');
        
        cards.forEach((card) => {
          // 1. Visibilidad estructural base garantizada
          card.style.opacity = '1';
          card.style.visibility = 'visible';

          const hook = card.querySelector<HTMLElement>('.cinemascope-hook');
          const title = card.querySelector<HTMLElement>('.cinemascope-title');
          const subtitle = card.querySelector<HTMLElement>('.cinemascope-subtitle');
          const excerpt = card.querySelector<HTMLElement>('.cinemascope-excerpt');
          const ctaBtn = card.querySelector<HTMLElement>('.mirror-cta-btn');
          const sheen = card.querySelector<HTMLElement>('.mirror-sheen');

          // Crear timeline individual por tarjeta con ScrollTrigger
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: 'top 82%',
              once: true,
            }
          });

          // SECUENCIA CINEMATOGRÁFICA ORQUESTADA (< 4.2s TOTAL):
          // 1. Hook inteligente Dark Academia (0s - 0.65s)
          if (hook) {
            tl.fromTo(
              hook,
              { opacity: 0, y: -14 },
              { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }
            );
          }

          // 2. Título principal Bodoni Extra Bold (~0.35s - 1.1s)
          if (title) {
            tl.fromTo(
              title,
              { opacity: 0, y: 22, letterSpacing: '-0.04em' },
              { opacity: 1, y: 0, letterSpacing: '-0.02em', duration: 0.75, ease: 'power4.out' },
              '-=0.35'
            );
          }

          // 3. Subtítulo (~0.9s - 1.5s)
          if (subtitle) {
            tl.fromTo(
              subtitle,
              { opacity: 0, y: 14 },
              { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
              '-=0.4'
            );
          }

          // 4. Excerpt / H3 descriptivo (~1.4s - 2.1s)
          if (excerpt) {
            tl.fromTo(
              excerpt,
              { opacity: 0, y: 15 },
              { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
              '-=0.35'
            );
          }

          // 5. CTA interna a color sólido con dinamismo espejo pulido (~2.0s - 2.75s)
          if (ctaBtn) {
            tl.fromTo(
              ctaBtn,
              { opacity: 0, y: 18, scale: 0.90 },
              { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: 'back.out(1.4)' },
              '-=0.3'
            );

            // Reflejo espejo pulido recorriendo el botón (concluye a los ~3.2s)
            if (sheen) {
              tl.fromTo(
                sheen,
                { xPercent: -100 },
                { xPercent: 120, duration: 0.85, ease: 'power2.inOut' },
                '-=0.25'
              );
            }
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
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>Todos</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/10">{totalItemsCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'magazine'}
        on:click={() => activeTab = 'magazine'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'magazine'
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>✦ Magazines</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-vault-accent/20 text-vault-accent">{filteredMagazines.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'ensayos'}
        on:click={() => activeTab = 'ensayos'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'ensayos'
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>✎ Ensayos & Artículos</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-vault-accent/20 text-vault-accent">{filteredEnsayos.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'd1'}
        on:click={() => activeTab = 'd1'}
        class="px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'd1'
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>◈ Bóveda D1 / R2</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/10">{filteredD1.length}</span>
      </button>
    </div>

    <!-- Buscador en tiempo real -->
    <div class="w-full md:w-72 relative">
      <input
        type="text"
        placeholder="Buscar en el archivo…"
        bind:value={searchQuery}
        class="w-full bg-black/40 border border-white/10 focus:border-vault-accent text-xs font-inter text-highlight px-4 py-2.5 rounded-full outline-none transition-all placeholder:text-primary/40 shadow-inner"
      />
      {#if searchQuery}
        <button
          type="button"
          on:click={() => searchQuery = ''}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary/40 hover:text-highlight cursor-pointer"
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
            <!-- ── CARD BENTO CINEMASCOPE (2.39:1) WIDESCREEN ── -->
            <article
              id={`cinemascope-card-${idx}`}
              class="cinemascope-card relative isolate w-full min-h-115 sm:min-h-125 lg:aspect-[2.39/1] rounded-4xl sm:rounded-[40px] overflow-hidden bg-(--card-bg,#23232a) border border-white/15 hover:border-vault-accent/70 shadow-[0_30px_90px_rgba(0,0,0,0.9)] transition-all duration-700 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 group/cinemascope text-left select-none opacity-100 visible"
            >
              <!-- 1. Fondo Cinemático Panorámico Full-Bleed Limpio y Brillante (Sin Scrims) -->
              <div class="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={mag.heroUrl}
                  alt={mag.title}
                  class="w-full h-full object-cover object-[center_35%] filter brightness-100 contrast-[1.04] transition-transform duration-1000 ease-out group-hover/cinemascope:scale-105 will-change-transform"
                  loading={idx === 0 ? "eager" : "lazy"}
                />

                <!-- Viñeta perimetral suave anti-costuras para tapar bordes redondeados y evitar z-fight -->
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(22,22,26,0.85)_100%)] pointer-events-none"></div>

                <!-- Remate interno de borde de cristal -->
                <div class="absolute inset-0 rounded-4xl sm:rounded-[40px] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
              </div>

              <!-- 2. Badges Superiores con Vidrio Flotante -->
              <div class="cinemascope-badges z-10 flex flex-wrap items-center justify-between gap-3 w-full">
                <div class="flex items-center gap-2.5">
                  <span class="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-vault-accent/40 text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-vault-accent font-semibold shadow-lg">
                    ✦ {mag.category}
                  </span>

                  {#if mag.isFresh}
                    <span class="px-3 py-1 rounded-full bg-vault-accent text-black text-[9px] font-mono uppercase tracking-widest font-black shadow-lg animate-pulse">
                      Nuevo
                    </span>
                  {/if}

                  <span class="hidden sm:inline-block px-3 py-1 rounded-full bg-black/50 text-white/90 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest backdrop-blur-md border border-white/15">
                    {mag.folios} Folios Editoriales
                  </span>
                </div>

                <!-- Datación / Fecha en cápsula de cristal -->
                <div class="px-3 py-1 rounded-full bg-black/60 border border-white/15 text-(--text-primary,#eae6df) font-mono text-[10px] sm:text-[11px] uppercase tracking-widest backdrop-blur-xs">
                  ⏳ {mag.date}
                </div>
              </div>

              <!-- 3. Contenido Central: Hook Inteligente > Título Extra Bold > Subtítulo > Excerpt H3 > Botón CTA a Color -->
              <div class="cinemascope-content z-10 my-auto py-8 sm:py-10 max-w-4xl flex flex-col items-start gap-4">
                
                <!-- 1. HOOK INTELIGENTE DARK ACADEMIA (NO BAIT) -->
                <div class="cinemascope-hook flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full bg-vault-accent shadow-[0_0_8px_rgba(201,169,110,0.8)] animate-pulse shrink-0"></span>
                  <span class="font-bodoni italic text-sm sm:text-base md:text-lg text-vault-accent font-medium tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.98),0_1px_4px_rgba(0,0,0,1)]">
                    «{hook.phrase}»
                  </span>
                </div>

                <!-- 2. TÍTULO EN EXTRA BOLD MONUMENTAL -->
                <h3 class="cinemascope-title font-bodoni font-extrabold text-3xl sm:text-5xl md:text-6xl text-white leading-[0.98] tracking-tight group-hover/cinemascope:text-vault-accent transition-colors [text-shadow:0_4px_24px_rgba(0,0,0,0.98),0_1px_4px_rgba(0,0,0,1)]">
                  {mag.title}
                </h3>

                <!-- 3. SUBTÍTULO -->
                <p class="cinemascope-subtitle font-bodoni italic text-base sm:text-xl md:text-2xl text-(--text-secondary,#a5a19a) tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]">
                  {mag.subtitle}
                </p>

                <!-- 4. VER MÁS / EXCERPT EDITORIAL (H3 / PARRAFO) -->
                <div class="cinemascope-excerpt space-y-2 max-w-3xl">
                  <p class="font-outfit text-xs sm:text-sm md:text-base text-(--text-primary,#eae6df) leading-relaxed font-normal [text-shadow:0_2px_10px_rgba(0,0,0,0.98),0_1px_3px_rgba(0,0,0,1)]">
                    {mag.excerpt}
                  </p>
                  <span class="text-[10px] font-mono text-vault-accent tracking-widest uppercase inline-block [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                    ↓ Desliza o pulsa el control para acceder al folio completo
                  </span>
                </div>

                <!-- 5. CTA INTERNA A COLOR DESTACADA CON DINÁMICA ESPEJO PULIDO -->
                <div class="cinemascope-cta-wrap pt-3">
                  <a
                    href={mag.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mirror-cta-btn relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5 rounded-full overflow-hidden bg-vault-accent text-black font-mono text-xs sm:text-sm font-black uppercase tracking-[0.25em] border border-vault-accent/90 shadow-[0_0_35px_rgba(201,169,110,0.5),0_8px_32px_rgba(0,0,0,0.6)] hover:bg-vault-accent/90 transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] group/btn cursor-pointer"
                  >
                    <!-- Capa de brillo espejo pulido con sweep dinámico -->
                    <span class="mirror-sheen absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-linear-to-r from-transparent via-white/70 to-transparent transition-transform duration-1000 ease-out pointer-events-none"></span>

                    <!-- Contenido del botón espejo a color -->
                    <span class="relative z-10 flex items-center gap-2.5 text-black">
                      <span>Abrir Magazine (HTML)</span>
                      <span class="text-base font-black group-hover/btn:translate-x-1.5 group-hover/btn:-translate-y-0.5 transition-transform duration-300">↗</span>
                    </span>

                    <span class="relative z-10 hidden sm:inline-block text-[10px] text-black/70 font-mono tracking-widest pl-2 border-l border-black/30">
                      Standalone 60/40
                    </span>
                  </a>
                </div>

              </div>

              <!-- 4. Pie de la Tarjeta Cinemascope -->
              <div class="cinemascope-footer z-10 flex items-center justify-between w-full pt-4 border-t border-white/10 text-[10px] font-mono text-(--text-secondary,#a5a19a) uppercase tracking-widest">
                <span>The Great Puzzle Magazine Archive</span>
                <span class="hidden sm:inline-block">Folio #{idx + 1} de {filteredMagazines.length}</span>
              </div>
            </article>

            <!-- ── CARTEL VISTOSO DE CTA "VER MÁS" COMO SEPARADOR CON SCROLL MEDIO ── -->
            {#if idx < filteredMagazines.length - 1}
              <div class="w-full py-8 sm:py-12 flex items-center justify-center">
                <div class="relative w-full max-w-3xl px-8 py-5 rounded-3xl bg-linear-to-r from-[#16161a]/95 via-vault-accent/10 to-[#16161a]/95 border border-vault-accent/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_0_40px_rgba(201,169,110,0.15)] text-left">
                  <div class="flex items-center gap-4">
                    <span class="w-3 h-3 rounded-full bg-vault-accent animate-ping shrink-0"></span>
                    <div>
                      <span class="text-[10px] font-mono uppercase tracking-[0.35em] text-vault-accent font-bold block mb-0.5">
                        ✦ Ver Más en la Hemeroteca
                      </span>
                      <p class="text-xs sm:text-sm font-bodoni italic text-white/85">
                        Continúa el recorrido vertical hacia la siguiente edición Cinemascope
                      </p>
                    </div>
                  </div>

                  <a
                    href={`#cinemascope-card-${idx + 1}`}
                    class="px-6 py-2.5 rounded-full bg-white/10 hover:bg-vault-accent hover:text-black border border-white/25 text-white text-[11px] font-mono uppercase tracking-widest font-bold transition-all duration-300 whitespace-nowrap shadow-md cursor-pointer flex items-center gap-2 group/next"
                  >
                    <span>Siguiente Edición</span>
                    <span class="group-hover/next:translate-y-0.5 transition-transform">↓</span>
                  </a>
                </div>
              </div>
            {/if}
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
            <!-- ── CARD BENTO CINEMASCOPE (2.39:1) ENSAYOS ── -->
            <article
              id={`cinemascope-ensayo-${idx}`}
              class="cinemascope-card relative isolate w-full min-h-115 sm:min-h-125 lg:aspect-[2.39/1] rounded-4xl sm:rounded-[40px] overflow-hidden bg-(--card-bg,#23232a) border border-white/15 hover:border-vault-accent/70 shadow-[0_30px_90px_rgba(0,0,0,0.9)] transition-all duration-700 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 group/cinemascope text-left select-none opacity-100 visible"
            >
              <!-- 1. Fondo Cinemático Panorámico Full-Bleed Limpio y Brillante (Sin Scrims) -->
              <div class="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={ensayo.imageUrl}
                  alt={ensayo.title}
                  class="w-full h-full object-cover object-[center_35%] filter brightness-100 contrast-[1.04] transition-transform duration-1000 ease-out group-hover/cinemascope:scale-105 will-change-transform"
                  loading="lazy"
                />

                <!-- Viñeta perimetral suave anti-costuras -->
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(22,22,26,0.85)_100%)] pointer-events-none"></div>
                <div class="absolute inset-0 rounded-4xl sm:rounded-[40px] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
              </div>

              <!-- 2. Badges Superiores con Vidrio Flotante -->
              <div class="cinemascope-badges z-10 flex flex-wrap items-center justify-between gap-3 w-full">
                <div class="flex items-center gap-2.5">
                  <span class="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-vault-accent/40 text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-vault-accent font-semibold shadow-lg">
                    ✎ {ensayo.category}
                  </span>

                  <span class="hidden sm:inline-block px-3 py-1 rounded-full bg-black/50 text-white/90 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest backdrop-blur-md border border-white/15">
                    Investigación Editorial
                  </span>
                </div>

                <div class="px-3 py-1 rounded-full bg-black/60 border border-white/15 text-(--text-primary,#eae6df) font-mono text-[10px] sm:text-[11px] uppercase tracking-widest backdrop-blur-xs">
                  ⏳ {ensayo.date}
                </div>
              </div>

              <!-- 3. Contenido Central: Hook Inteligente > Título Extra Bold > Subtítulo > Excerpt H3 > Botón CTA a Color -->
              <div class="cinemascope-content z-10 my-auto py-8 sm:py-10 max-w-4xl flex flex-col items-start gap-4">
                
                <!-- 1. HOOK INTELIGENTE DARK ACADEMIA -->
                <div class="cinemascope-hook flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full bg-vault-accent shadow-[0_0_8px_rgba(201,169,110,0.8)] animate-pulse shrink-0"></span>
                  <span class="font-bodoni italic text-sm sm:text-base md:text-lg text-vault-accent font-medium tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.98),0_1px_4px_rgba(0,0,0,1)]">
                    «{hook.phrase}»
                  </span>
                </div>

                <!-- 2. TÍTULO EN EXTRA BOLD MONUMENTAL -->
                <h3 class="cinemascope-title font-bodoni font-extrabold text-3xl sm:text-5xl md:text-6xl text-white leading-[0.98] tracking-tight group-hover/cinemascope:text-vault-accent transition-colors [text-shadow:0_4px_24px_rgba(0,0,0,0.98),0_1px_4px_rgba(0,0,0,1)]">
                  {ensayo.title}
                </h3>

                <!-- 3. VOLANTA / SUBTÍTULO -->
                {#if ensayo.volanta}
                  <p class="cinemascope-subtitle font-bodoni italic text-base sm:text-xl md:text-2xl text-(--text-secondary,#a5a19a) tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]">
                    {ensayo.volanta}
                  </p>
                {/if}

                <!-- 4. EXCERPT DESCRIPTIVO H3 -->
                {#if ensayo.description}
                  <div class="cinemascope-excerpt space-y-2 max-w-3xl">
                    <p class="font-outfit text-xs sm:text-sm md:text-base text-(--text-primary,#eae6df) leading-relaxed font-normal [text-shadow:0_2px_10px_rgba(0,0,0,0.98),0_1px_3px_rgba(0,0,0,1)]">
                      {ensayo.description}
                    </p>
                    <span class="text-[10px] font-mono text-vault-accent tracking-widest uppercase inline-block [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                      ↓ Desliza o pulsa el control para acceder a la lectura integral
                    </span>
                  </div>
                {/if}

                {#if ensayo.tags && ensayo.tags.length > 0}
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    {#each ensayo.tags as tag}
                      <span class="px-2.5 py-1 rounded-full text-[9px] font-mono bg-black/60 text-vault-accent border border-vault-accent/30 backdrop-blur-xs">
                        #{tag}
                      </span>
                    {/each}
                  </div>
                {/if}

                <!-- 5. CTA INTERNA A COLOR DESTACADA CON DINÁMICA ESPEJO PULIDO -->
                <div class="cinemascope-cta-wrap pt-3">
                  <a
                    href={ensayo.url}
                    class="mirror-cta-btn relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5 rounded-full overflow-hidden bg-vault-accent text-black font-mono text-xs sm:text-sm font-black uppercase tracking-[0.25em] border border-vault-accent/90 shadow-[0_0_35px_rgba(201,169,110,0.5),0_8px_32px_rgba(0,0,0,0.6)] hover:bg-vault-accent/90 transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] group/btn cursor-pointer"
                  >
                    <span class="mirror-sheen absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-linear-to-r from-transparent via-white/70 to-transparent transition-transform duration-1000 ease-out pointer-events-none"></span>

                    <span class="relative z-10 flex items-center gap-2.5 text-black">
                      <span>Leer Ensayo Editorial</span>
                      <span class="text-base font-black group-hover/btn:translate-x-1.5 transition-transform duration-300">→</span>
                    </span>

                    <span class="relative z-10 hidden sm:inline-block text-[10px] text-black/70 font-mono tracking-widest pl-2 border-l border-black/30">
                      Bóveda TGP
                    </span>
                  </a>
                </div>
              </div>

              <!-- 4. Pie de la Tarjeta Cinemascope -->
              <div class="cinemascope-footer z-10 flex items-center justify-between w-full pt-4 border-t border-white/10 text-[10px] font-mono text-(--text-secondary,#a5a19a) uppercase tracking-widest">
                <span>Colección de Ensayos & Artículos</span>
                <span class="hidden sm:inline-block">Ensayo #{idx + 1} de {filteredEnsayos.length}</span>
              </div>
            </article>

            <!-- Separador Cartel CTA Ver Más -->
            {#if idx < filteredEnsayos.length - 1}
              <div class="w-full py-8 sm:py-12 flex items-center justify-center">
                <div class="relative w-full max-w-3xl px-8 py-5 rounded-3xl bg-linear-to-r from-[#16161a]/95 via-vault-accent/10 to-[#16161a]/95 border border-vault-accent/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_0_40px_rgba(201,169,110,0.15)] text-left">
                  <div class="flex items-center gap-4">
                    <span class="w-3 h-3 rounded-full bg-vault-accent animate-ping shrink-0"></span>
                    <div>
                      <span class="text-[10px] font-mono uppercase tracking-[0.35em] text-vault-accent font-bold block mb-0.5">
                        ✦ Ver Más Ensayos Editoriales
                      </span>
                      <p class="text-xs sm:text-sm font-bodoni italic text-white/85">
                        Continúa el recorrido vertical hacia la siguiente investigación
                      </p>
                    </div>
                  </div>

                  <a
                    href={`#cinemascope-ensayo-${idx + 1}`}
                    class="px-6 py-2.5 rounded-full bg-white/10 hover:bg-vault-accent hover:text-black border border-white/25 text-white text-[11px] font-mono uppercase tracking-widest font-bold transition-all duration-300 whitespace-nowrap shadow-md cursor-pointer flex items-center gap-2 group/next"
                  >
                    <span>Siguiente Ensayo</span>
                    <span class="group-hover/next:translate-y-0.5 transition-transform">↓</span>
                  </a>
                </div>
              </div>
            {/if}
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
            <!-- ── CARD BENTO CINEMASCOPE (2.39:1) BÓVEDA D1 / R2 ── -->
            <article
              id={`cinemascope-d1-${idx}`}
              class="cinemascope-card relative isolate w-full min-h-115 sm:min-h-125 lg:aspect-[2.39/1] rounded-4xl sm:rounded-[40px] overflow-hidden bg-(--card-bg,#23232a) border border-white/15 hover:border-vault-success/70 shadow-[0_30px_90px_rgba(0,0,0,0.9)] transition-all duration-700 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 group/cinemascope text-left select-none opacity-100 visible"
            >
              <!-- 1. Fondo Cinemático Panorámico Full-Bleed Limpio y Brillante (Sin Scrims) -->
              <div class="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={item.imageUrl || '/magazine-hero-gobekli.jpg'}
                  alt={item.title}
                  class="w-full h-full object-cover object-[center_35%] filter brightness-100 contrast-[1.04] transition-transform duration-1000 ease-out group-hover/cinemascope:scale-105 will-change-transform"
                  loading="lazy"
                />

                <!-- Viñeta perimetral suave anti-costuras -->
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(22,22,26,0.85)_100%)] pointer-events-none"></div>
                <div class="absolute inset-0 rounded-4xl sm:rounded-[40px] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
              </div>

              <!-- 2. Badges Superiores con Vidrio Flotante -->
              <div class="cinemascope-badges z-10 flex flex-wrap items-center justify-between gap-3 w-full">
                <div class="flex items-center gap-2.5">
                  <span class="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-vault-success/40 text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-vault-success font-semibold shadow-lg">
                    ◈ {item.category}
                  </span>

                  <span class="hidden sm:inline-block px-3 py-1 rounded-full bg-black/50 text-white/90 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest backdrop-blur-md border border-white/15">
                    Cloudflare D1 · Registro Inmutable
                  </span>
                </div>

                <div class="px-3 py-1 rounded-full bg-black/60 border border-white/15 text-(--text-primary,#eae6df) font-mono text-[10px] sm:text-[11px] uppercase tracking-widest backdrop-blur-xs">
                  ⏳ {item.date}
                </div>
              </div>

              <!-- 3. Contenido Central: Hook Inteligente > Título Extra Bold > Subtítulo > Excerpt H3 > Botón CTA a Color Esmeralda -->
              <div class="cinemascope-content z-10 my-auto py-8 sm:py-10 max-w-4xl flex flex-col items-start gap-4">
                
                <!-- 1. HOOK INTELIGENTE DARK ACADEMIA -->
                <div class="cinemascope-hook flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full bg-vault-success shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0"></span>
                  <span class="font-bodoni italic text-sm sm:text-base md:text-lg text-vault-success font-medium tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.98),0_1px_4px_rgba(0,0,0,1)]">
                    «{hook.phrase}»
                  </span>
                </div>

                <!-- 2. TÍTULO EN EXTRA BOLD MONUMENTAL -->
                <h3 class="cinemascope-title font-bodoni font-extrabold text-3xl sm:text-5xl md:text-6xl text-white leading-[0.98] tracking-tight group-hover/cinemascope:text-vault-success transition-colors [text-shadow:0_4px_24px_rgba(0,0,0,0.98),0_1px_4px_rgba(0,0,0,1)]">
                  {item.title}
                </h3>

                <!-- 3. VOLANTA / SUBTÍTULO -->
                <p class="cinemascope-subtitle font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-vault-success font-bold [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                  ◈ REGISTRO DE BÓVEDA D1 · ALMACENAMIENTO R2
                </p>

                <!-- 4. EXCERPT DESCRIPTIVO H3 -->
                {#if item.description}
                  <div class="cinemascope-excerpt space-y-2 max-w-3xl">
                    <p class="font-outfit text-xs sm:text-sm md:text-base text-(--text-primary,#eae6df) leading-relaxed font-normal [text-shadow:0_2px_10px_rgba(0,0,0,0.98),0_1px_3px_rgba(0,0,0,1)]">
                      {item.description}
                    </p>
                    <span class="text-[10px] font-mono text-vault-success tracking-widest uppercase inline-block [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                      ↓ Pulsa para abrir el visor de inspección estratigráfica
                    </span>
                  </div>
                {/if}

                {#if item.tags && item.tags.length > 0}
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    {#each item.tags as tag}
                      <span class="px-2.5 py-1 rounded-full text-[9px] font-mono bg-black/60 text-vault-success border border-vault-success/30 backdrop-blur-xs">
                        #{tag}
                      </span>
                    {/each}
                  </div>
                {/if}

                <!-- 5. CTA INTERNA A COLOR ESMERALDA DESTACADA CON DINÁMICA ESPEJO PULIDO -->
                <div class="cinemascope-cta-wrap pt-3">
                  <button
                    type="button"
                    on:click={() => selectedArtifact = item}
                    class="mirror-cta-btn relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5 rounded-full overflow-hidden bg-vault-success text-black font-mono text-xs sm:text-sm font-black uppercase tracking-[0.25em] border border-vault-success/90 shadow-[0_0_35px_rgba(52,211,153,0.5),0_8px_32px_rgba(0,0,0,0.6)] hover:bg-vault-success/90 transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] group/btn cursor-pointer"
                  >
                    <span class="mirror-sheen absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-linear-to-r from-transparent via-white/70 to-transparent transition-transform duration-1000 ease-out pointer-events-none"></span>

                    <span class="relative z-10 flex items-center gap-2.5 text-black">
                      <span>Inspeccionar Artefacto</span>
                      <span class="text-base font-black group-hover/btn:translate-x-1.5 transition-transform duration-300">◈</span>
                    </span>

                    <span class="relative z-10 hidden sm:inline-block text-[10px] text-black/70 font-mono tracking-widest pl-2 border-l border-black/30">
                      Cloudflare D1
                    </span>
                  </button>
                </div>
              </div>

              <!-- 4. Pie de la Tarjeta Cinemascope -->
              <div class="cinemascope-footer z-10 flex items-center justify-between w-full pt-4 border-t border-white/10 text-[10px] font-mono text-(--text-secondary,#a5a19a) uppercase tracking-widest">
                <span>The Great Puzzle Vault Database</span>
                <span class="hidden sm:inline-block">Artefacto #{idx + 1} de {filteredD1.length}</span>
              </div>
            </article>

            <!-- Separador Cartel CTA Ver Más -->
            {#if idx < filteredD1.length - 1}
              <div class="w-full py-8 sm:py-12 flex items-center justify-center">
                <div class="relative w-full max-w-3xl px-8 py-5 rounded-3xl bg-linear-to-r from-[#16161a]/95 via-vault-success/10 to-[#16161a]/95 border border-vault-success/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_0_40px_rgba(52,211,153,0.12)] text-left">
                  <div class="flex items-center gap-4">
                    <span class="w-3 h-3 rounded-full bg-vault-success animate-ping shrink-0"></span>
                    <div>
                      <span class="text-[10px] font-mono uppercase tracking-[0.35em] text-vault-success font-bold block mb-0.5">
                        ✦ Ver Más Artefactos D1
                      </span>
                      <p class="text-xs sm:text-sm font-bodoni italic text-white/85">
                        Continúa explorando los registros arqueológicos de la Bóveda Cloudflare
                      </p>
                    </div>
                  </div>

                  <a
                    href={`#cinemascope-d1-${idx + 1}`}
                    class="px-6 py-2.5 rounded-full bg-white/10 hover:bg-vault-success hover:text-black border border-white/25 text-white text-[11px] font-mono uppercase tracking-widest font-bold transition-all duration-300 whitespace-nowrap shadow-md cursor-pointer flex items-center gap-2 group/next"
                  >
                    <span>Siguiente Registro</span>
                    <span class="group-hover/next:translate-y-0.5 transition-transform">↓</span>
                  </a>
                </div>
              </div>
            {/if}
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

  /* Efecto Espejo Pulido con barrido de luz especular */
  .mirror-cta-btn {
    position: relative;
    box-shadow: 0 8px 32px rgba(255, 255, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.7);
  }

  .mirror-cta-btn:hover .mirror-sheen {
    transform: translateX(200%);
    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
</style>
