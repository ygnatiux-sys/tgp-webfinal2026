<script lang="ts">
  // VaultEngine.svelte — Mesa de Trabajo Modular y Orquestador TGP-Vault
  // Integración unificada con el Design System Obsidian Void (Bodoni Moda + Inter + Glassmorphism)

  import { onMount } from 'svelte';
  import { TGP_MOTORES, MODOS_OPERACION } from '../../config/tgp-tools';
  import ModoScriptorium from './ModoScriptorium.svelte';

  // ─── Estado General ────────────────────────────────────────────────
  let modoActivo = 'historico';
  let securityToken = '';
  let tokenVisible = false;
  let status: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  let statusMessage = '';
  let lastGeneratedUrl = '';
  let copyFeedback = false;

  // ─── Estado de Formularios ─────────────────────────────────────────
  // Metadatos comunes
  let titulo = '';
  let era = '';
  let coordenadas = '';
  let contenidoTexto = '';

  // Archivos
  let droppedFiles: File[] = [];
  let isDragging = false;
  let fileInputEl: HTMLInputElement;

  // WikiForge
  let wikiSearch = '';
  let wikiResults: any[] = [];

  // TGP Mind
  let mindPrompt = '';
  let mindResponse = '';
  let formatoCognitivo: 'magazine' | 'ensayo' = 'magazine';

  // TGP Magazine
  let magazinePrompt = '';
  let magazineArticle: any = null;
  let magazineTheme: 'charcoal' | 'paper' = 'charcoal';

  // Ref a Scriptorium
  let scriptoriumRef: any;

  // Modo actual
  $: currentModo = MODOS_OPERACION.find(m => m.id === modoActivo) || MODOS_OPERACION[0];

  // ─── Manejo de Archivos ───────────────────────────────────────────
  const ACCEPTED_EXTS = ['.txt', '.pdf', '.mdoc', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  function getExt(file: File) {
    return '.' + file.name.split('.').pop()?.toLowerCase();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function processFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter(f =>
      ACCEPTED_EXTS.includes(getExt(f)) || f.type.startsWith('image/')
    );
    droppedFiles = [...droppedFiles, ...valid];
  }

  function removeFile(index: number) {
    droppedFiles = droppedFiles.filter((_, i) => i !== index);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files) {
      processFiles(e.dataTransfer.files);
    }
  }

  function onFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      processFiles(target.files);
    }
  }

  function selectMode(modeId: string) {
    modoActivo = modeId;
    status = 'idle';
    statusMessage = '';
  }

  // ─── Copiar URL de R2 al portapapeles ──────────────────────────────
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback = true;
      setTimeout(() => (copyFeedback = false), 2500);
    } catch {
      // fallback
    }
  }

  // ─── Utilidades de Historial, Borradores y Persistencia ────────────────────────
  let localDraftsList: any[] = [];

  function cargarBorradoresLocales() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('tgp_magazines_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localDraftsList = parsed;
          return;
        }
      }
    } catch {}
    localDraftsList = [];
  }

  function eliminarBorrador(slugOrId: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`tgp_magazine_draft_${slugOrId}`);
      localStorage.removeItem(`tgp_magazine_${slugOrId}`);
      localDraftsList = localDraftsList.filter((item: any) => item.id !== slugOrId && item.slug !== slugOrId);
      localStorage.setItem('tgp_magazines_history', JSON.stringify(localDraftsList));
    } catch (e) {
      console.warn('[VaultEngine] Error eliminando borrador:', e);
    }
  }

  async function publicarBorrador(item: any) {
    const cleanToken = securityToken.trim();
    if (cleanToken.length !== 4) {
      status = 'error';
      statusMessage = 'Introduce tu clave personal de 4 dígitos abajo para autorizar la publicación de este borrador.';
      return;
    }

    status = 'loading';
    statusMessage = `Autorizando y publicando "${item.title}" en GitHub (draft: false)…`;

    try {
      // 1. Actualizar estado local a draft: false
      item.draft = false;
      item.isPublished = true;
      if (item.data) item.data.draft = false;

      localStorage.setItem(`tgp_magazine_draft_${item.slug || item.id}`, JSON.stringify(item.data || item));
      localStorage.setItem(`tgp_magazine_${item.slug || item.id}`, JSON.stringify(item.data || item));

      localDraftsList = localDraftsList.map(d => d.id === item.id ? { ...d, draft: false, isPublished: true } : d);
      localStorage.setItem('tgp_magazines_history', JSON.stringify(localDraftsList));

      // 2. Transmitir a TGP Mind para publicar en GitHub con draft: false
      const inboxUrl = TGP_MOTORES.mind;
      if (inboxUrl) {
        const galleryUrls = (item.data?.galeria?.slider || []).map((s: any) => s.url).filter(Boolean);
        if (item.heroUrl) galleryUrls.unshift(item.heroUrl);

        await fetch(inboxUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({
            prompt_natural: `Publicar oficialmente edición Magazine en repositorio GitHub con título "${item.title}". Resumen: ${item.excerpt || ''}. Texto: ${item.data?.body || ''}`,
            titulo: item.title,
            slug: item.slug || item.id,
            draft: false,
            mode: 'magazine_mdx',
            frontmatter: {
              title: item.title,
              slug: item.slug || item.id,
              abstract: item.excerpt || '',
              volanta: item.subtitle || 'Edición Magazine',
              layoutMode: 'magazine',
              powertype: 'Revista Inmersiva 60/40',
              draft: false,
              gallery: galleryUrls,
              category: item.category || 'Magazine',
              date: new Date().toISOString(),
            },
          }),
        });
      }

      status = 'success';
      statusMessage = `✦ "${item.title}" ha sido autorizado y publicado como definitivo (draft: false).`;
    } catch (e: any) {
      status = 'error';
      statusMessage = `Error autorizando borrador: ${e?.message || e}`;
    }
  }

  onMount(() => {
    cargarBorradoresLocales();
  });


  function slugify(text: string): string {
    const clean = (text || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return clean ? `${clean}-${Date.now().toString().slice(-4)}` : `edicion-${Date.now()}`;
  }

  async function persistirEnGitHub(resJson: any, slug: string, token: string) {
    try {
      const inboxUrl = TGP_MOTORES.mind;
      if (!inboxUrl) return;

      const galleryUrls = (resJson.galeria?.slider || []).map((s: any) => s.url).filter(Boolean);
      if (resJson.heroUrl) galleryUrls.unshift(resJson.heroUrl);

      await fetch(inboxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt_natural: `Crear y respaldar edición Magazine como ensayo MDX en repositorio con título "${resJson.titulo}". Resumen: ${resJson.excerpt || ''}. Texto: ${resJson.body || ''}`,
          titulo: resJson.titulo,
          slug: slug,
          draft: true,
          mode: 'magazine_mdx',
          frontmatter: {
            title: resJson.titulo,
            slug: slug,
            abstract: resJson.excerpt || '',
            volanta: resJson.subtitulo || 'Edición Magazine',
            layoutMode: 'magazine',
            powertype: 'Revista Inmersiva 60/40',
            draft: true,
            gallery: galleryUrls,
            category: resJson.category || 'Magazine',
            date: new Date().toISOString(),
          },
        }),
      }).catch(e => console.warn('[VaultEngine] Fallback GitHub commit:', e));
    } catch (err) {
      console.warn('[VaultEngine] Error intentando guardar en GitHub:', err);
    }
  }

  function persistirMagazineEnHistorial(resJson: any, queryFallback: string, token: string) {
    const editionSlug = slugify(resJson.slug || resJson.titulo || queryFallback || 'edicion');
    const title = resJson.titulo || 'Edición Histórica';

    const newMagazineItem = {
      id: editionSlug,
      slug: editionSlug,
      url: `/magazine/viewer?id=${editionSlug}`,
      title: title,
      subtitle: resJson.subtitulo || 'Edición Forjada por TGP Mind',
      excerpt: resJson.excerpt || '',
      heroUrl: resJson.heroUrl || (resJson.galeria?.slider?.[0]?.url) || '/magazine-hero-gobekli.jpg',
      category: resJson.category || 'TGP Mind · En Vivo',
      date: resJson.date || new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
      folios: (resJson.galeria?.slider?.length || 0) + 1,
      isFresh: true,
      draft: true,
      createdAt: Date.now(),
      data: resJson,
    };

    if (typeof window !== 'undefined') {
      // 1. Guardar bajo clave única tgp_magazine_draft_${slug} y tgp_magazine_${slug}
      localStorage.setItem(`tgp_magazine_draft_${editionSlug}`, JSON.stringify(resJson));
      localStorage.setItem(`tgp_magazine_${editionSlug}`, JSON.stringify(resJson));

      // 2. Persistir en el array de historial de revistas
      let history: any[] = [];
      try {
        const rawHistory = localStorage.getItem('tgp_magazines_history');
        history = rawHistory ? JSON.parse(rawHistory) : [];
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }

      // Prevenir duplicados por id y anteponer la nueva revista
      history = [newMagazineItem, ...history.filter((item: any) => item.id !== editionSlug)];
      localStorage.setItem('tgp_magazines_history', JSON.stringify(history));

      // Guardar también en sessionStorage para visor inmediato
      sessionStorage.setItem('tgp_current_magazine', JSON.stringify(resJson));

      // Recargar lista reactiva para la interfaz
      cargarBorradoresLocales();

      // 3. Persistencia real en GitHub con draft: true
      persistirEnGitHub(resJson, editionSlug, token);
    }

    return { editionSlug, title };
  }

  // ─── Ejecución del Protocolo ──────────────────────────────────────
  async function ejecutarProtocolo() {
    const cleanToken = securityToken.trim();
    if (cleanToken.length !== 4) {
      status = 'error';
      statusMessage = 'Introduce tu clave personal de 4 dígitos para autorizar el protocolo.';
      return;
    }

    const motorKey = currentModo.motor;
    const motorUrl = TGP_MOTORES[motorKey];

    if (!motorUrl) {
      status = 'error';
      statusMessage = `El motor "${motorKey}" no tiene endpoint configurado en el archivo .env`;
      return;
    }

    status = 'loading';
    statusMessage = `Autorizando y conectando con ${motorKey.toUpperCase()}…`;
    lastGeneratedUrl = '';

    try {
      let response: Response;

      // 1. MODO SCRIPTURIUM (Ensayos generados/publicados con TGP Mind con draft: true)
      if (modoActivo === 'scriptorium') {
        const payload = scriptoriumRef?.getPayload();
        if (!payload) throw new Error('No se pudo compilar el contenido de Scriptorium.');
        if (!payload.titulo?.trim()) throw new Error('Introduce un título para el ensayo.');

        // Se envía a TGP Mind con clave de seguridad autorizada para commitear en GitHub como borrador protegido
        const mindUrl = TGP_MOTORES.mind || motorUrl;
        response = await fetch(mindUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({
            prompt_natural: `Publicar ensayo en borrador: ${payload.titulo}\n\n${payload.html || ''}`,
            titulo: payload.titulo,
            era: payload.era,
            coordenadas: payload.coordenadas,
            html: payload.html,
            mode: 'ensayo',
            draft: true,
            frontmatter: {
              draft: true,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Error ${response.status}: ${errText || response.statusText}`);
        }

        const resJson = await response.json().catch(() => null);
        status = 'success';
        statusMessage = `✦ Ensayo respaldado en GitHub con draft: true por TGP Mind: "${payload.titulo}".`;
        return;

      // 2. MODO WIKIFORGE (Proxy)
      } else if (modoActivo === 'wikiforge') {
        if (!wikiSearch.trim()) {
          throw new Error('Introduce un término de búsqueda o enlace de Wikimedia.');
        }

        response = await fetch(motorUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({ buscar: wikiSearch.trim() }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Error ${response.status}: ${errText || response.statusText}`);
        }

        const data = await response.json();
        wikiResults = Array.isArray(data) ? data : data.imagenes || data.resultados || [data];
        status = 'success';
        statusMessage = `WikiForge extrajo ${wikiResults.length} artefactos con éxito.`;
        return;

      // 3. MODO TGP MIND (IA)
      } else if (modoActivo === 'cognitivo') {
        if (!mindPrompt.trim() && droppedFiles.length === 0) {
          throw new Error('Introduce una consulta o adjunta un artefacto para el análisis cognitivo.');
        }

        if (formatoCognitivo === 'magazine') {
          // Apuntar al endpoint /magazine de tgp-mind con solicitud de persistencia en repo y draft: true
          const magUrl = motorUrl.replace(/\/inbox\/?$/, '/magazine');
          response = await fetch(magUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cleanToken}`,
            },
            body: JSON.stringify({
              prompt_natural: `Edición monográfica de revista inmersiva 60/40 sobre: ${mindPrompt.trim()}. Requisito obligatorio: Extrae con WikiForge una galería completa de al menos 5 imágenes históricas de alta resolución en galeria.slider con sus títulos y análisis iconográficos para estructurar 5 folios editoriales.`,
              tema: mindPrompt.trim(),
              min_images: 5,
              images_count: 5,
              num_folios: 5,
              theme: magazineTheme,
              draft: true,
              persist_github: true,
              commit_to_repo: true,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error ${response.status}: ${errText || response.statusText}`);
          }

          const resJson = await response.json().catch(() => null);
          magazineArticle = resJson;

          // Registro permanente en historial (clave única tgp_magazine_draft_${slug} y respaldo GitHub)
          const { editionSlug, title } = persistirMagazineEnHistorial(resJson, mindPrompt, cleanToken);

          status = 'success';
          statusMessage = `Edición Magazine "${title}" forjada, respaldada en GitHub y guardada en local (draft: true). Redirigiendo a /magazine/viewer?id=${editionSlug}…`;

          // Redirección al visor dinámico con ID permanente
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = `/magazine/viewer?id=${editionSlug}`;
            }
          }, 600);
          return;

        } else {
          // Modo Ensayo MDX estándar (/inbox) con TGP Mind — commit directo en GitHub con draft: true
          response = await fetch(motorUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cleanToken}`,
            },
            body: JSON.stringify({
              prompt_natural: mindPrompt.trim(),
              mode: 'ensayo',
              draft: true,
              frontmatter: {
                draft: true,
              },
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error ${response.status}: ${errText || response.statusText}`);
          }

          const resJson = await response.json().catch(() => null);
          mindResponse = resJson?.mdx_preview || resJson?.respuesta || resJson?.analisis || 'Ensayo cognitivo publicado en GitHub con draft: true.';

          // Guardar copia en historial local de ensayos generados
          if (typeof window !== 'undefined') {
            try {
              let ensayosHistory = JSON.parse(localStorage.getItem('tgp_ensayos_history') || '[]');
              const newEnsayo = {
                title: resJson?.title || mindPrompt.slice(0, 45) + '...',
                slug: resJson?.slug,
                date: new Date().toLocaleDateString('es-ES'),
                preview: mindResponse.slice(0, 200) + '...',
                draft: true,
              };
              ensayosHistory = [newEnsayo, ...ensayosHistory.filter((e: any) => e.slug !== newEnsayo.slug)];
              localStorage.setItem('tgp_ensayos_history', JSON.stringify(ensayosHistory));
            } catch {}
          }

          status = 'success';
          statusMessage = '✦ Ensayo autorizado y respaldado en GitHub con draft: true por TGP Mind.';
          return;
        }

      // 3B. MODO TGP MAGAZINE (WikiForge + Gemini + R2 60/40)
      } else if (modoActivo === 'magazine') {
        const query = (magazinePrompt || mindPrompt).trim();
        if (!query) {
          throw new Error('Introduce un tema para forjar la edición Magazine.');
        }

        const magUrl = motorUrl.replace(/\/inbox\/?$/, '/magazine');
        response = await fetch(magUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({
            prompt_natural: `Edición monográfica de revista inmersiva 60/40 sobre: ${query}. Requisito obligatorio: Extrae con WikiForge una galería completa de al menos 5 imágenes históricas de alta resolución en galeria.slider con sus títulos y análisis iconográficos para estructurar 5 folios editoriales.`,
            tema: query,
            min_images: 5,
            images_count: 5,
            num_folios: 5,
            theme: magazineTheme,
            draft: true,
            persist_github: true,
            commit_to_repo: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Error ${response.status}: ${errText || response.statusText}`);
        }

        const resJson = await response.json().catch(() => null);
        magazineArticle = resJson;

        // Registro permanente en historial y respaldo GitHub
        const { editionSlug, title } = persistirMagazineEnHistorial(resJson, query, cleanToken);

        status = 'success';
        statusMessage = `Edición Magazine "${title}" forjada, respaldada en GitHub y guardada en local (draft: true). Redirigiendo a /magazine/viewer?id=${editionSlug}…`;

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = `/magazine/viewer?id=${editionSlug}`;
          }
        }, 600);
        return;


      // 4. MODOS VAULT: Bóveda D1 / Solo Imagen / Solo Texto
      } else {
        const fd = new FormData();
        fd.append('mode', modoActivo);
        if (titulo.trim()) fd.append('titulo', titulo.trim());
        if (era.trim()) fd.append('era', era.trim());
        if (coordenadas.trim()) fd.append('coordenadas', coordenadas.trim());
        if (contenidoTexto.trim()) fd.append('description', contenidoTexto.trim());

        droppedFiles.forEach(f => fd.append('file', f));


        response = await fetch(motorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: fd,
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text || response.statusText}`);
      }

      // Procesar respuesta
      const jsonRes = await response.json().catch(() => null);
      if (jsonRes?.image_url || jsonRes?.url) {
        lastGeneratedUrl = jsonRes.image_url || jsonRes.url;
      }

      status = 'success';
      statusMessage = modoActivo === 'solo_imagen'
        ? 'Artefacto transmutado a WebP y alojado en Cloudflare R2.'
        : 'Registro transmitido e indexado con éxito.';

      // Limpieza parcial si fue exitoso
      if (modoActivo !== 'scriptorium') {
        droppedFiles = [];
        contenidoTexto = '';
      }

    } catch (err: any) {
      status = 'error';
      statusMessage = err?.message || 'Error de comunicación con el motor.';
    }
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════════
     TGP-VAULT — Mesa de Trabajo Modular (Full Page Experience)
═══════════════════════════════════════════════════════════════════ -->
<div class="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 font-inter">

  <!-- ── CABECERA PRINCIPAL ────────────────────────────────────────── -->
  <header class="text-center mb-12">
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-vault-accent/30 bg-vault-accent/5 backdrop-blur-md mb-6">
      <span class="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse"></span>
      <span class="text-[10px] uppercase font-mono tracking-[0.35em] text-vault-accent">
        The Great Puzzle Project · Mesa de Operaciones
      </span>
    </div>

    <h1 class="font-bodoni text-4xl sm:text-5xl lg:text-6xl text-highlight mb-4 tracking-tight">
      TGP-Vault <span class="text-vault-accent italic font-light font-bodoni">&</span> Forja
    </h1>

    <p class="text-primary/70 text-xs sm:text-sm tracking-[0.25em] uppercase max-w-2xl mx-auto leading-relaxed">
      Arquitectura técnica de ingesta histórica, transmutación multimedia y síntesis cognitiva.
    </p>

    <!-- Indicadores de Enlace de Motores -->
    <div class="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] font-mono tracking-widest uppercase">
      <div class="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/2">
        <span class="w-2 h-2 rounded-full {TGP_MOTORES.vault ? 'bg-vault-success shadow-[0_0_8px_#6dba8a]' : 'bg-white/20'}"></span>
        <span class="text-primary/80">Vault (D1 + R2)</span>
      </div>

      <div class="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/2">
        <span class="w-2 h-2 rounded-full {TGP_MOTORES.proxy ? 'bg-vault-success shadow-[0_0_8px_#6dba8a]' : 'bg-white/20'}"></span>
        <span class="text-primary/80">Proxy (WikiForge)</span>
      </div>

      <div class="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/2">
        <span class="w-2 h-2 rounded-full {TGP_MOTORES.mind ? 'bg-vault-success shadow-[0_0_8px_#6dba8a]' : 'bg-white/20'}"></span>
        <span class="text-primary/80">Mind (IA Cognitiva)</span>
      </div>
    </div>
  </header>

  <!-- ── PANEL DE OPERACIONES (BENTO GLASS WORKBENCH) ──────────────── -->
  <div class="bento-glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">

    <!-- ── SELECTOR DE MODOS (TABS EDITORIALES) ────────────────────── -->
    <div class="border-b border-white/10 pb-6 mb-8">
      <div class="flex flex-wrap gap-2 sm:gap-3" role="tablist" aria-label="Modos de la Bóveda">
        {#each MODOS_OPERACION as modo}
          <button
            role="tab"
            aria-selected={modoActivo === modo.id}
            on:click={() => selectMode(modo.id)}
            class="px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300 border
                   {modoActivo === modo.id
                     ? 'border-vault-accent bg-vault-accent/15 text-highlight shadow-[0_0_20px_rgba(201,169,110,0.25)] font-bold'
                     : 'border-white/5 text-primary/60 hover:text-highlight hover:border-white/20 hover:bg-white/2'}"
          >
            {modo.label}
          </button>
        {/each}
      </div>

      <!-- Descripción del Modo Activo -->
      <div class="mt-4 flex items-center justify-between gap-4 text-xs text-primary/60">
        <p class="italic text-vault-accent/90 flex items-center gap-2">
          <span>◈</span>
          <span>{currentModo.desc}</span>
        </p>
        <span class="font-mono text-[10px] uppercase tracking-widest text-primary/40 hidden sm:inline-block">
          Motor asignado: <strong class="text-vault-accent uppercase">{currentModo.motor}</strong>
        </span>
      </div>
    </div>

    <!-- ── ESPACIO DE TRABAJO DINÁMICO ──────────────────────────────── -->
    <div class="min-h-70 space-y-6">

      <!-- MODO 1: BÓVEDA D1 (INGESTA HISTÓRICA COMPLETA) -->
      {#if modoActivo === 'historico'}
        <div class="space-y-6">
          <!-- Metadatos de la Entrada -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="vault-label" for="h-titulo">Título del Documento</label>
              <input
                id="h-titulo"
                type="text"
                class="vault-input"
                placeholder="Ej. Tratado sobre el Olvido Digital"
                bind:value={titulo}
              />
            </div>
            <div>
              <label class="vault-label" for="h-era">Era / Periodo Histórico</label>
              <input
                id="h-era"
                type="text"
                class="vault-input"
                placeholder="Ej. 2026 · Era del Silicio"
                bind:value={era}
              />
            </div>
            <div>
              <label class="vault-label" for="h-coords">Coordenadas Geográficas</label>
              <input
                id="h-coords"
                type="text"
                class="vault-input"
                placeholder="Ej. 40.4168° N, 3.7038° O"
                bind:value={coordenadas}
              />
            </div>
          </div>

          <!-- Dropzone Multimedio -->
          <div
            role="button"
            tabindex="0"
            class="vault-dropzone {isDragging ? 'dragging' : ''}"
            on:dragover={onDragOver}
            on:dragleave={onDragLeave}
            on:drop={onDrop}
            on:click={() => fileInputEl.click()}
            on:keydown={(e) => e.key === 'Enter' && fileInputEl.click()}
          >
            <input
              type="file"
              multiple
              accept=".txt,.pdf,.mdoc,image/*"
              class="hidden"
              bind:this={fileInputEl}
              on:change={onFileInputChange}
            />

            {#if droppedFiles.length === 0}
              <div class="text-2xl text-vault-accent opacity-70">◈</div>
              <p class="text-highlight font-light text-sm tracking-wide">
                Arrastra artefactos o haz clic para explorar
              </p>
              <p class="text-[11px] font-mono tracking-widest text-primary/40 uppercase">
                .TXT · .PDF · .MDOC · .JPG · .PNG · .WEBP
              </p>
            {:else}
              <div class="w-full max-w-xl space-y-2 p-2">
                <p class="text-xs font-mono uppercase tracking-widest text-vault-accent text-center mb-3">
                  {droppedFiles.length} artefacto(s) encolado(s) para transmutación:
                </p>
                {#each droppedFiles as f, i}
                  <div class="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-xs">
                    <span class="truncate max-w-[70%] text-highlight">📎 {f.name}</span>
                    <div class="flex items-center gap-3">
                      <span class="text-[10px] font-mono text-primary/50">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        on:click|stopPropagation={() => removeFile(i)}
                        class="text-primary/40 hover:text-vault-danger transition-colors text-sm px-1"
                        aria-label="Quitar archivo"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                {/each}
                <p class="text-[10px] text-center text-primary/40 pt-2 hover:text-vault-accent cursor-pointer">
                  + Haz clic para adjuntar más archivos
                </p>
              </div>
            {/if}
          </div>

          <!-- Área de Contenido HTML / Texto -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="vault-label mb-0" for="h-texto">Cuerpo del Ensayo o Registro (HTML / Texto Plano)</label>
              <span class="text-[10px] font-mono text-primary/40">{contenidoTexto.length} caracteres</span>
            </div>
            <textarea
              id="h-texto"
              rows="6"
              class="vault-input resize-y font-mono text-xs leading-relaxed"
              placeholder="Introduce o pega el ensayo, fuentes documentales o transcripción aquí…"
              bind:value={contenidoTexto}
            ></textarea>
          </div>
        </div>

      <!-- MODO 2: SCRIPTORIUM (EDITOR TIPTAP ENRIQUECIDO) -->
      {:else if modoActivo === 'scriptorium'}
        <div class="space-y-4">
          <ModoScriptorium
            bind:this={scriptoriumRef}
            webhookUrl={TGP_MOTORES.vault || ''}
            {securityToken}
          />
        </div>

      <!-- MODO 3: FORJA WEBP (SOLO COMPRESIÓN Y GUARDADO R2) -->
      {:else if modoActivo === 'solo_imagen'}
        <div class="space-y-6">
          <div
            role="button"
            tabindex="0"
            class="vault-dropzone min-h-64 {isDragging ? 'dragging' : ''}"
            on:dragover={onDragOver}
            on:dragleave={onDragLeave}
            on:drop={onDrop}
            on:click={() => fileInputEl.click()}
            on:keydown={(e) => e.key === 'Enter' && fileInputEl.click()}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              class="hidden"
              bind:this={fileInputEl}
              on:change={onFileInputChange}
            />

            {#if droppedFiles.length === 0}
              <div class="text-3xl text-vault-accent">⚡</div>
              <p class="text-highlight font-light text-base tracking-wide">
                Arroja imágenes para forjar su versión WebP en Cloudflare R2
              </p>
              <p class="text-[11px] font-mono tracking-widest text-primary/40 uppercase">
                JPG · PNG · TIFF · WEBP · SVG → Transmutación instantánea a WebP
              </p>
            {:else}
              <div class="w-full max-w-lg space-y-3 p-2">
                <p class="text-xs font-mono uppercase tracking-widest text-vault-accent text-center">
                  {droppedFiles.length} imagen(es) lista(s) para compresión:
                </p>
                {#each droppedFiles as f, i}
                  <div class="flex items-center justify-between px-4 py-3 rounded-lg bg-white/4 border border-white/10 text-xs">
                    <span class="truncate max-w-[70%] text-highlight font-mono">🖼 {f.name}</span>
                    <div class="flex items-center gap-3">
                      <span class="text-[10px] font-mono text-primary/50">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        on:click|stopPropagation={() => removeFile(i)}
                        class="text-primary/40 hover:text-vault-danger transition-colors text-sm px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          {#if lastGeneratedUrl}
            <div class="p-6 rounded-2xl bg-white/3 border border-vault-accent/30 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono uppercase tracking-widest text-vault-accent">
                  ✦ Artefacto Forjado en Cloudflare R2:
                </span>
                <button
                  type="button"
                  on:click={() => copyToClipboard(lastGeneratedUrl)}
                  class="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded bg-vault-accent/20 text-vault-accent hover:bg-vault-accent hover:text-bg transition-colors"
                >
                  {copyFeedback ? '✓ Copiado' : 'Copiar URL'}
                </button>
              </div>

              <div class="flex flex-col sm:flex-row gap-4 items-center">
                <img
                  src={lastGeneratedUrl}
                  alt="Previsualización forjada"
                  class="w-32 h-32 object-cover rounded-xl border border-white/10"
                />
                <div class="flex-1 w-full overflow-hidden">
                  <p class="font-mono text-xs text-primary/80 break-all select-all bg-black/40 p-3 rounded border border-white/5">
                    {lastGeneratedUrl}
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </div>

      <!-- MODO 4: LIMPIEZA HTML (SOLO TEXTO HISTÓRICO) -->
      {:else if modoActivo === 'solo_texto'}
        <div class="space-y-4">
          <div>
            <label class="vault-label" for="st-titulo">Título / Identificador</label>
            <input
              id="st-titulo"
              type="text"
              class="vault-input"
              placeholder="Referencia o encabezado de la transcripción…"
              bind:value={titulo}
            />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="vault-label mb-0" for="st-texto">Texto Legado / Documento Crudo</label>
              <span class="text-[10px] font-mono text-primary/40">{contenidoTexto.length} caracteres</span>
            </div>
            <textarea
              id="st-texto"
              rows="12"
              class="vault-input resize-y font-mono text-xs leading-relaxed"
              placeholder="Pega el fragmento de texto o HTML para sanitizar y registrar…"
              bind:value={contenidoTexto}
            ></textarea>
          </div>
        </div>

      <!-- MODO 5: WIKIFORGE (PROXY WIKIMEDIA) -->
      {:else if modoActivo === 'wikiforge'}
        <div class="space-y-6">
          <div>
            <label class="vault-label" for="wf-search">URL o Término en Wikimedia</label>
            <div class="flex gap-3">
              <input
                id="wf-search"
                type="text"
                class="vault-input flex-1"
                placeholder="https://es.wikipedia.org/wiki/Pangea o término..."
                bind:value={wikiSearch}
                on:keydown={(e) => e.key === 'Enter' && ejecutarProtocolo()}
              />
            </div>
          </div>

          {#if wikiResults.length > 0}
            <div class="space-y-4 pt-4 border-t border-white/5">
              <p class="text-xs font-mono uppercase tracking-widest text-vault-accent">
                Artefactos extraídos ({wikiResults.length}):
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                {#each wikiResults as item}
                  <div class="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                    {#if item.url || (typeof item === 'string' && item.startsWith('http'))}
                      <img
                        src={item.url || item}
                        alt="Wiki Artifact"
                        class="w-full h-32 object-cover rounded-lg"
                        loading="lazy"
                      />
                    {/if}
                    <p class="text-xs font-mono text-primary/70 break-all">
                      {typeof item === 'string' ? item : item.title || JSON.stringify(item)}
                    </p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

      <!-- MODO 6: TGP MIND (ANÁLISIS COGNITIVO IA) -->
      {:else if modoActivo === 'cognitivo'}
        <div class="space-y-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="vault-label mb-0" for="mind-prompt">Instrucción Cognitiva / Consulta</label>
              <div class="flex items-center gap-2 text-[10px] font-mono">
                <span class="text-primary/40">Formato:</span>
                <button
                  type="button"
                  on:click={() => formatoCognitivo = 'magazine'}
                  class="px-2.5 py-1 rounded-full transition-all {formatoCognitivo === 'magazine' ? 'bg-vault-accent text-black font-bold shadow-[0_0_12px_rgba(201,169,110,0.3)]' : 'bg-white/5 text-primary/60 hover:bg-white/10'}"
                >
                  ✦ Revista (60/40)
                </button>
                <button
                  type="button"
                  on:click={() => formatoCognitivo = 'ensayo'}
                  class="px-2.5 py-1 rounded-full transition-all {formatoCognitivo === 'ensayo' ? 'bg-vault-accent text-black font-bold' : 'bg-white/5 text-primary/60 hover:bg-white/10'}"
                >
                  📝 Ensayo MDX
                </button>
              </div>
            </div>
            <textarea
              id="mind-prompt"
              rows="4"
              class="vault-input resize-y text-xs leading-relaxed"
              placeholder={formatoCognitivo === 'magazine'
                ? "Ej. Haz un artículo sobre Göbekli Tepe, Zenobia de Palmira o el Colapso del Bronce..."
                : "Ej. Realiza un análisis deconstructivo sobre los siguientes fragmentos respecto a la epistemología del olvido..."}
              bind:value={mindPrompt}
            ></textarea>
            {#if formatoCognitivo === 'magazine'}
              <div class="mt-2 flex items-center justify-between text-[11px] font-mono">
                <span class="text-vault-accent/90 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse"></span>
                  WikiForge extraerá imágenes y se registrará en tu historial permanente en /magazine/viewer.
                </span>
                <div class="flex items-center gap-1.5">
                  <span class="text-primary/40">Tema:</span>
                  <button
                    type="button"
                    on:click={() => magazineTheme = 'charcoal'}
                    class="px-2 py-0.5 rounded text-[10px] {magazineTheme === 'charcoal' ? 'bg-white/20 text-white font-bold' : 'text-primary/50'}"
                  >
                    Charcoal
                  </button>
                  <button
                    type="button"
                    on:click={() => magazineTheme = 'paper'}
                    class="px-2 py-0.5 rounded text-[10px] {magazineTheme === 'paper' ? 'bg-white/20 text-white font-bold' : 'text-primary/50'}"
                  >
                    Paper
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <!-- Dropzone Opcional para Análisis Visual de IA -->
          <div
            role="button"
            tabindex="0"
            class="vault-dropzone min-h-32 {isDragging ? 'dragging' : ''}"
            on:dragover={onDragOver}
            on:dragleave={onDragLeave}
            on:drop={onDrop}
            on:click={() => fileInputEl.click()}
            on:keydown={(e) => e.key === 'Enter' && fileInputEl.click()}
          >
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt"
              class="hidden"
              bind:this={fileInputEl}
              on:change={onFileInputChange}
            />
            {#if droppedFiles.length === 0}
              <p class="text-xs font-mono tracking-wider text-primary/50 uppercase">
                🧠 Adjuntar artefacto para análisis multimodal (Opcional)
              </p>
            {:else}
              <div class="flex flex-wrap gap-2">
                {#each droppedFiles as f, i}
                  <span class="px-3 py-1 rounded bg-white/10 text-xs font-mono flex items-center gap-2">
                    📎 {f.name}
                    <button type="button" on:click|stopPropagation={() => removeFile(i)}>✕</button>
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          {#if mindResponse}
            <div class="p-6 rounded-2xl bg-white/3 border border-white/10 space-y-3">
              <div class="flex items-center justify-between border-b border-white/5 pb-2">
                <span class="text-xs font-mono uppercase tracking-widest text-vault-accent">✦ Síntesis de TGP Mind:</span>
                <button
                  type="button"
                  on:click={() => copyToClipboard(mindResponse)}
                  class="text-[10px] font-mono uppercase tracking-wider text-primary/60 hover:text-highlight"
                >
                  {copyFeedback ? '✓ Copiado' : 'Copiar Texto'}
                </button>
              </div>
              <div class="text-sm leading-relaxed text-primary/90 whitespace-pre-wrap font-inter">
                {mindResponse}
              </div>
            </div>
          {/if}
        </div>

      <!-- MODO 7: TGP MAGAZINE (VISOR EDITORIAL 60/40) -->
      {:else if modoActivo === 'magazine'}
        <div class="space-y-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="vault-label mb-0" for="mag-topic">Tema o Asunto para la Edición Magazine</label>
              <div class="flex items-center gap-2 text-[10px] font-mono">
                <span class="text-primary/40">Tema visual:</span>
                <button
                  type="button"
                  on:click={() => magazineTheme = 'charcoal'}
                  class="px-2.5 py-1 rounded-full transition-all {magazineTheme === 'charcoal' ? 'bg-vault-accent text-black font-bold' : 'bg-white/5 text-primary/60 hover:bg-white/10'}"
                >
                  ✦ Charcoal
                </button>
                <button
                  type="button"
                  on:click={() => magazineTheme = 'paper'}
                  class="px-2.5 py-1 rounded-full transition-all {magazineTheme === 'paper' ? 'bg-vault-accent text-black font-bold' : 'bg-white/5 text-primary/60 hover:bg-white/10'}"
                >
                  ◈ Paper
                </button>
              </div>
            </div>
            <input
              id="mag-topic"
              type="text"
              class="vault-input text-xs"
              placeholder="Ej. Göbekli Tepe, El Colapso de la Edad del Bronce, Pompeya, Zenobia de Palmira..."
              bind:value={magazinePrompt}
              on:keydown={(e) => e.key === 'Enter' && ejecutarProtocolo()}
            />
            <p class="mt-2 text-[11px] text-primary/40 font-mono">
              ✦ WikiForge rastreará artefactos fotográficos de alta resolución y Gemini estructurará la edición 60/40.
            </p>
          </div>

          {#if magazineArticle}
            <div class="p-6 rounded-2xl bg-white/3 border border-vault-accent/30 space-y-4 shadow-[0_0_40px_rgba(201,169,110,0.1)]">
              <div class="flex items-center justify-between border-b border-white/10 pb-3">
                <span class="text-xs font-mono uppercase tracking-widest text-vault-accent flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-vault-accent animate-pulse"></span>
                  Edición Magazine Forjada:
                </span>
                <a
                  href="/magazine/viewer"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-4 py-1.5 rounded-full bg-vault-accent text-black text-xs font-mono uppercase tracking-wider font-bold hover:bg-vault-accent/90 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(201,169,110,0.3)] hover:scale-105"
                >
                  ✦ Abrir en Magazine Viewer (60/40) ↗
                </a>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {#if magazineArticle.heroUrl}
                  <img
                    src={magazineArticle.heroUrl}
                    alt={magazineArticle.titulo}
                    class="w-full h-36 object-cover rounded-xl border border-white/10 shadow-lg"
                  />
                {/if}
                <div class="sm:col-span-2 space-y-2">
                  <h3 class="font-bodoni text-xl text-highlight font-normal">{magazineArticle.titulo}</h3>
                  <p class="text-xs italic text-vault-accent/90">{magazineArticle.subtitulo || ''}</p>
                  <p class="text-xs text-primary/70 line-clamp-3 leading-relaxed">{magazineArticle.excerpt}</p>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- ── HISTORIAL DE BORRADORES Y ARTÍCULOS LOCALES GUARDADOS ── -->
      <div class="mt-10 pt-8 border-t border-white/10 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono uppercase tracking-widest text-vault-accent font-semibold flex items-center gap-1.5">
              <span>📚</span>
              <span>Borradores & Revistas Guardadas en Local ({localDraftsList.length}):</span>
            </span>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-vault-accent/10 border border-vault-accent/30 text-vault-accent">
              Identificador único · Sin sobrescritura
            </span>
          </div>
          <button
            type="button"
            on:click={cargarBorradoresLocales}
            class="text-[10px] font-mono text-primary/50 hover:text-highlight transition-colors uppercase tracking-widest flex items-center gap-1"
          >
            <span>↺ Actualizar Lista</span>
          </button>
        </div>

        {#if localDraftsList.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-120 overflow-y-auto pr-1">
            {#each localDraftsList as item}
              <div class="p-4 rounded-2xl bg-white/2 border border-white/10 hover:border-vault-accent/40 transition-all flex flex-col justify-between group space-y-3 shadow-md">
                <div class="flex gap-4">
                  {#if item.heroUrl}
                    <img
                      src={item.heroUrl}
                      alt={item.title}
                      class="w-20 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                      loading="lazy"
                    />
                  {/if}
                  <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[9px] font-mono text-vault-accent uppercase tracking-widest truncate">
                        {item.date || 'Reciente'}
                      </span>
                      {#if item.draft === false || item.isPublished}
                        <span class="px-2 py-0.5 rounded text-[8px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                          ✓ Publicado
                        </span>
                      {:else}
                        <span class="px-2 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                          draft: true
                        </span>
                      {/if}
                    </div>
                    <h4 class="font-bodoni text-base text-highlight font-semibold truncate group-hover:text-vault-accent transition-colors">
                      {item.title}
                    </h4>
                    <p class="text-[11px] text-primary/60 line-clamp-2 leading-relaxed">
                      {item.excerpt || item.subtitle || ''}
                    </p>
                  </div>
                </div>

                <!-- Botones de Acción -->
                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                  <div class="flex items-center gap-2">
                    <a
                      href="/magazine/viewer?id={item.slug || item.id}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-3 py-1.5 rounded-lg bg-vault-accent/15 border border-vault-accent/30 text-vault-accent hover:bg-vault-accent hover:text-black transition-all text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5"
                    >
                      <span>Abrir Visor (60/40)</span>
                      <span>↗</span>
                    </a>

                    {#if item.draft !== false && !item.isPublished}
                      <button
                        type="button"
                        on:click={() => publicarBorrador(item)}
                        class="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-sm"
                        title="Autorizar y consolidar como público en GitHub (draft: false)"
                      >
                        <span>🚀 Publicar</span>
                      </button>
                    {:else}
                      <span class="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 px-1">
                        <span>✓ Consolidado</span>
                      </span>
                    {/if}
                  </div>

                  <button
                    type="button"
                    on:click={() => eliminarBorrador(item.id || item.slug)}
                    class="text-[10px] text-vault-danger/60 hover:text-vault-danger transition-colors uppercase tracking-wider px-2 py-1 rounded hover:bg-vault-danger/10"
                    title="Eliminar borrador local"
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-8 rounded-2xl border border-dashed border-white/10 bg-white/1 text-center text-primary/40 text-xs font-mono">
            No hay borradores guardados localmente aún. Cada revista forjada aparecerá aquí con su propio identificador único sin sobreescribir ninguna previa.
          </div>
        {/if}
      </div>

    </div>

    <!-- ── BARRA DE CONTROL Y TRANSMISIÓN ───────────────────────────── -->
    <div class="mt-10 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">

      <!-- Clave de Acceso (PIN 4 Dígitos) -->
      <div class="flex items-center gap-4 w-full md:w-auto">
        <div class="relative">
          {#if tokenVisible}
            <input
              id="v-token-visible"
              type="text"
              maxlength="4"
              class="w-32 bg-black/40 border border-white/15 focus:border-vault-accent text-highlight font-mono tracking-[0.5em] text-center text-sm py-3 px-3 rounded-xl outline-none transition-all shadow-inner"
              placeholder="••••"
              bind:value={securityToken}
              autocomplete="off"
              spellcheck="false"
            />
          {:else}
            <input
              id="v-token-hidden"
              type="password"
              maxlength="4"
              class="w-32 bg-black/40 border border-white/15 focus:border-vault-accent text-highlight font-mono tracking-[0.5em] text-center text-sm py-3 px-3 rounded-xl outline-none transition-all shadow-inner"
              placeholder="••••"
              bind:value={securityToken}
              autocomplete="off"
              spellcheck="false"
            />
          {/if}

          <button
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/40 hover:text-highlight transition-colors text-xs"
            on:click={() => tokenVisible = !tokenVisible}
            tabindex="-1"
            aria-label={tokenVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
          >
            {tokenVisible ? '◉' : '◎'}
          </button>
        </div>

        <div class="flex flex-col">
          <span class="text-[10px] uppercase font-mono tracking-[0.2em] text-primary/50">Clave de Seguridad</span>
          <span class="text-[10px] font-mono text-vault-accent">{securityToken.length}/4 Dígitos</span>
        </div>
      </div>

      <!-- Estado / Feedback -->
      <div class="flex-1 text-center md:text-left">
        {#if status === 'loading'}
          <span class="text-xs font-mono text-vault-accent animate-pulse">
            ⏳ {statusMessage}
          </span>
        {:else if status === 'success'}
          <span class="text-xs font-mono text-vault-success">
            ✦ {statusMessage}
          </span>
        {:else if status === 'error'}
          <span class="text-xs font-mono text-vault-danger">
            ⚠ {statusMessage}
          </span>
        {/if}
      </div>

      <!-- Botón Transmitir / Ejecutar -->
      <button
        id="btn-ejecutar-protocolo"
        class="cta-vault w-full md:w-auto"
        class:loading={status === 'loading'}
        disabled={status === 'loading'}
        on:click={ejecutarProtocolo}
        aria-label="Ejecutar protocolo de la Bóveda"
      >
        <span class="text-xs">◈</span>
        <span>{status === 'loading' ? 'Transmitiendo…' : 'Ejecutar Protocolo'}</span>
      </button>
    </div>

  </div>

</div>
