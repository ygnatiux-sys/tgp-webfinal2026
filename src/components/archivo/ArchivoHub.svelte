<script lang="ts">
  import { onMount } from 'svelte';

  export let initialD1Items: any[] = [];

  // Pestaña activa: 'all' | 'magazine' | 'd1'
  let activeTab: 'all' | 'magazine' | 'd1' = 'all';
  let searchQuery = '';
  let loadingD1 = false;

  // ─── EDICIONES MAGAZINE (Revistas Inmersivas 60/40) ──────────────────────────
  let magazines = [
    {
      id: 'gobekli-tepe',
      slug: 'test',
      url: '/magazine/test',
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
      slug: 'draft_id',
      url: '/magazine/draft_id',
      title: 'Pompeya y el Vesubio',
      subtitle: 'La paradoja de la piedra y la eternidad',
      excerpt: 'Bajo el manto de cenizas del 79 d.C., una civilización quedó petrificada en un diálogo suspendido entre la fragilidad humana y la fuerza geológica.',
      heroUrl: 'https://storage.thegreatpuzzleproject.com/vault-media/magazine/pompeya-y-el-vesubio/vesuvius-from-pompeii-hires-version-2png.webp',
      category: 'Catástrofe & Memoria',
      date: '3 sept 2026',
      folios: 4,
      isFresh: true,
    },
    {
      id: 'biblioteca-alejandria',
      slug: 'viewer',
      url: '/magazine/viewer',
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

  // ─── REGISTROS D1 / ARTEFACTOS R2 ──────────────────────────────────────────
  let d1Items = initialD1Items.length > 0 ? initialD1Items : [
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

  onMount(async () => {
    // 1. Detectar si hay un Magazine recién generado en localStorage
    try {
      const rawDraft = localStorage.getItem('tgp_magazine_draft_id') || localStorage.getItem('tgp_magazine_draft');
      if (rawDraft) {
        const draftObj = JSON.parse(rawDraft);
        if (draftObj && draftObj.titulo) {
          const alreadyExists = magazines.some(m => m.title === draftObj.titulo);
          if (!alreadyExists) {
            magazines = [
              {
                id: 'draft-live',
                slug: 'draft_id',
                url: '/magazine/draft_id',
                title: draftObj.titulo,
                subtitle: draftObj.subtitulo || 'Edición Forjada por TGP Mind',
                excerpt: draftObj.excerpt || '',
                heroUrl: draftObj.heroUrl || '/magazine-hero-gobekli.jpg',
                category: draftObj.category || 'TGP Mind · En Vivo',
                date: draftObj.date || 'Reciente',
                folios: (draftObj.galeria?.slider?.length || 0) + 1,
                isFresh: true,
              },
              ...magazines
            ];
          }
        }
      }
    } catch (e) {
      console.warn('[ArchivoHub] Error leyendo draft en localStorage:', e);
    }

    // 2. Intentar consultar registros en vivo de D1 si el servicio está activo
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
  });

  // Filtrado reactivo
  $: filteredMagazines = magazines.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.title.toLowerCase().includes(q) || m.subtitle.toLowerCase().includes(q) || m.excerpt.toLowerCase().includes(q);
  });

  $: filteredD1 = d1Items.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
  });

  $: totalItemsCount = filteredMagazines.length + filteredD1.length;
</script>

<div class="w-full max-w-7xl mx-auto font-inter">

  <!-- ── BARRA DE SOLAPAS Y BUSCADOR (DISEÑO EDITORIAL OBSIDIAN) ── -->
  <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 border-b border-white/10 pb-8">
    
    <!-- Selector de Solapas -->
    <div class="flex flex-wrap items-center gap-2 sm:gap-3" role="tablist" aria-label="Secciones del Archivo">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'all'}
        on:click={() => activeTab = 'all'}
        class="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'all'
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>Todos</span>
        <span class="px-2 py-0.2 rounded-full text-[10px] bg-white/10">{totalItemsCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'magazine'}
        on:click={() => activeTab = 'magazine'}
        class="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'magazine'
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>✦ Ediciones Magazine</span>
        <span class="px-2 py-0.2 rounded-full text-[10px] bg-vault-accent/20 text-vault-accent">{filteredMagazines.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'd1'}
        on:click={() => activeTab = 'd1'}
        class="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border flex items-center gap-2
               {activeTab === 'd1'
                 ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                 : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
      >
        <span>◈ Bóveda D1 / R2</span>
        <span class="px-2 py-0.2 rounded-full text-[10px] bg-white/10">{filteredD1.length}</span>
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
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary/40 hover:text-highlight"
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
    <div class="mb-16">
      
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each filteredMagazines as mag}
            <article class="bento-glass rounded-3xl overflow-hidden border border-white/10 hover:border-vault-accent/50 transition-all duration-500 flex flex-col justify-between group shadow-xl hover:shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
              
              <div>
                <!-- Portada con badge -->
                <div class="relative w-full h-56 overflow-hidden bg-black/60">
                  <img
                    src={mag.heroUrl}
                    alt={mag.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                  <!-- Badges superiores -->
                  <div class="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <span class="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-vault-accent/40 text-[9px] font-mono uppercase tracking-widest text-vault-accent font-semibold">
                      ✦ {mag.category}
                    </span>

                    {#if mag.isFresh}
                      <span class="px-2.5 py-0.5 rounded-full bg-vault-accent text-black text-[9px] font-mono uppercase tracking-widest font-bold shadow-lg animate-pulse">
                        Nuevo
                      </span>
                    {/if}
                  </div>

                  <!-- Folios indicador -->
                  <div class="absolute bottom-3 left-4 text-[10px] font-mono text-primary/70 tracking-widest uppercase">
                    <span>{mag.folios} Folios Editoriales</span>
                  </div>
                </div>

                <!-- Textos Editoriales -->
                <div class="p-6 sm:p-7 space-y-3">
                  <span class="text-[10px] font-mono text-vault-accent/80 tracking-widest uppercase block">
                    {mag.date}
                  </span>

                  <h3 class="font-bodoni text-2xl text-highlight group-hover:text-vault-accent transition-colors font-bold leading-tight">
                    {mag.title}
                  </h3>

                  <p class="text-xs italic text-vault-accent/90 font-bodoni">
                    {mag.subtitle}
                  </p>

                  <p class="text-xs text-primary/70 line-clamp-3 leading-relaxed font-light">
                    {mag.excerpt}
                  </p>
                </div>
              </div>

              <!-- CTA para abrir en su propio HTML -->
              <div class="p-6 pt-0">
                <a
                  href={mag.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:border-vault-accent hover:bg-vault-accent hover:text-black transition-all text-xs font-mono uppercase tracking-[0.18em] font-semibold flex items-center justify-center gap-2 group/btn shadow-md"
                >
                  <span>Abrir Magazine (HTML)</span>
                  <span class="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-0.5 transition-transform text-sm">↗</span>
                </a>
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
       SECCIÓN 2: BÓVEDA D1 & ARTEFACTOS R2
  ═══════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'all' || activeTab === 'd1'}
    <div class="mt-8">
      
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
          class="text-[11px] font-mono text-vault-accent hover:text-highlight tracking-widest uppercase flex items-center gap-1.5 border border-vault-accent/30 px-3 py-1.5 rounded-full hover:bg-vault-accent/10 transition-all"
        >
          <span>◈ Ir a Mesa de Forja</span>
          <span>→</span>
        </a>
      </div>

      {#if filteredD1.length > 0}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each filteredD1 as item}
            <div class="p-6 rounded-3xl bg-black/40 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group space-y-4">
              
              <div>
                {#if item.imageUrl}
                  <div class="w-full h-44 rounded-2xl overflow-hidden bg-white/2 border border-white/5 mb-4 relative">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div class="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[8px] font-mono text-primary/80 uppercase tracking-widest">
                      WebP · Cloudflare R2
                    </div>
                  </div>
                {/if}

                <div class="flex items-center justify-between text-[9px] font-mono text-primary/50 tracking-widest uppercase mb-2">
                  <span>{item.date}</span>
                  <span class="text-vault-success">{item.category}</span>
                </div>

                <h4 class="font-bodoni text-lg text-highlight font-semibold mb-2 group-hover:text-vault-accent transition-colors">
                  {item.title}
                </h4>

                <p class="text-xs text-primary/60 font-light line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <!-- Tags -->
              {#if item.tags && item.tags.length > 0}
                <div class="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                  {#each item.tags as tag}
                    <span class="px-2 py-0.5 rounded text-[8px] font-mono bg-white/5 text-primary/60 border border-white/5">
                      #{tag}
                    </span>
                  {/each}
                </div>
              {/if}

            </div>
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
