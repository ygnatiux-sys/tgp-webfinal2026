<script>
  // ModoScriptorium.svelte — Editor TipTap + metadatos

  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Image from '@tiptap/extension-image';
  import Placeholder from '@tiptap/extension-placeholder';

  /** URL del webhook (pasada como prop desde VaultEngine) */
  export let webhookUrl = '';
  export let securityToken = '';

  // Metadatos
  let titulo = '';
  let era = '';
  let coordenadas = '';

  // Editor ref y estado interno
  let editorEl;
  let editorInstance = null;
  let isTransmuting = false;   // estado cuando se procesa una imagen externa

  // ─── Ciclo de vida ────────────────────────────────────────────
  onMount(() => {
    editorInstance = new Editor({
      element: editorEl,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Comienza a escribir el registro histórico…',
        }),
        Image.configure({ inline: false, allowBase64: false }),
      ],
      content: '',
      editorProps: {
        // Capturar paste de imágenes o URLs en el editor
        handlePaste(view, event) {
          const items = Array.from(event.clipboardData?.items ?? []);

          // 1. ¿Hay una imagen en el clipboard (objeto binario)?
          const imagItem = items.find(i => i.type.startsWith('image/'));
          if (imagItem) {
            event.preventDefault();
            const file = imagItem.getAsFile();
            if (file) transmutarImagenDesdeArchivo(file);
            return true;
          }

          // 2. ¿El texto pegado es una URL de imagen externa?
          const textItem = items.find(i => i.type === 'text/plain');
          if (textItem) {
            textItem.getAsString(text => {
              const trimmed = text.trim();
              if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
                event.preventDefault();
                transmutarImagenDesdeUrl(trimmed);
              }
            });
          }

          return false; // dejar que ProseMirror maneje el resto
        },

        // Capturar drop de imágenes externas
        handleDrop(view, event) {
          const files = Array.from(event.dataTransfer?.files ?? []);
          const imgFile = files.find(f => f.type.startsWith('image/'));
          if (imgFile) {
            event.preventDefault();
            transmutarImagenDesdeArchivo(imgFile);
            return true;
          }
          return false;
        },
      },
    });
  });

  onDestroy(() => {
    editorInstance?.destroy();
  });

  // ─── Transmutación de imágenes ────────────────────────────────

  /**
   * Convierte un File (imagen binaria) en WebP via webhook y la inserta.
   * @param {File} file
   */
  async function transmutarImagenDesdeArchivo(file) {
    isTransmuting = true;
    try {
      const fd = new FormData();
      fd.append('image_file', file);
      fd.append('token', securityToken);

      const res = await fetch(`${webhookUrl}/transmute-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${securityToken}`,
        },
        body: fd,
      });
      if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
      const { url } = await res.json();
      editorInstance?.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      console.error('[Scriptorium] Error transmutando imagen desde archivo:', err);
    } finally {
      isTransmuting = false;
    }
  }

  /**
   * Envía una URL externa al webhook para transmutarla a WebP y la inserta.
   * @param {string} externalUrl
   */
  async function transmutarImagenDesdeUrl(externalUrl) {
    isTransmuting = true;
    try {
      const res = await fetch(`${webhookUrl}/transmute-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${securityToken}`,
        },
        body: JSON.stringify({ image_url: externalUrl, token: securityToken }),
      });
      if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
      const { url } = await res.json();
      editorInstance?.chain().focus().setImage({ src: url, alt: 'Imagen transmutada' }).run();
    } catch (err) {
      console.error('[Scriptorium] Error transmutando imagen desde URL:', err);
    } finally {
      isTransmuting = false;
    }
  }

  // ─── Barra de herramientas ─────────────────────────────────────
  function applyFormat(cmd) {
    if (!editorInstance) return;
    const chain = editorInstance.chain().focus();
    switch (cmd) {
      case 'bold':        chain.toggleBold().run(); break;
      case 'italic':      chain.toggleItalic().run(); break;
      case 'h2':          chain.toggleHeading({ level: 2 }).run(); break;
      case 'h3':          chain.toggleHeading({ level: 3 }).run(); break;
      case 'blockquote':  chain.toggleBlockquote().run(); break;
      case 'ul':          chain.toggleBulletList().run(); break;
      case 'ol':          chain.toggleOrderedList().run(); break;
      case 'hr':          chain.setHorizontalRule().run(); break;
    }
  }

  /** Insertar imagen desde URL manual */
  function insertarImagenManual() {
    const url = prompt('URL de imagen a transmutar:');
    if (url?.trim()) transmutarImagenDesdeUrl(url.trim());
  }

  // ─── API pública ───────────────────────────────────────────────
  /** @returns {{ titulo: string, era: string, coordenadas: string, html: string }} */
  export function getPayload() {
    return {
      titulo,
      era,
      coordenadas,
      html: editorInstance?.getHTML() ?? '',
    };
  }
</script>

<!-- Barra de herramientas del editor -->
<div
  class="flex flex-wrap items-center gap-1 px-3 py-2 bg-vault-raised border border-vault-border rounded-sm mb-0"
  id="scriptorium-toolbar"
  aria-label="Barra de herramientas del editor"
>
  {#each [
    { cmd: 'bold',       label: 'B',  title: 'Negrita'       },
    { cmd: 'italic',     label: 'I',  title: 'Cursiva'       },
    { cmd: 'h2',         label: 'H2', title: 'Título 2'      },
    { cmd: 'h3',         label: 'H3', title: 'Título 3'      },
    { cmd: 'blockquote', label: '❝',  title: 'Cita'          },
    { cmd: 'ul',         label: '≡',  title: 'Lista'         },
    { cmd: 'ol',         label: '①',  title: 'Lista numerada'},
    { cmd: 'hr',         label: '—',  title: 'Separador'     },
  ] as btn}
    <button
      class="px-2 py-1 text-xs text-vault-muted hover:text-vault-accent hover:bg-vault-surface
             rounded-sm transition-colors duration-200 font-mono font-bold"
      onclick={() => applyFormat(btn.cmd)}
      title={btn.title}
    >
      {btn.label}
    </button>
  {/each}

  <div class="h-4 w-px bg-vault-border mx-1"></div>

  <button
    class="px-2 py-1 text-xs text-vault-muted hover:text-vault-accent hover:bg-vault-surface
           rounded-sm transition-colors duration-200"
    onclick={insertarImagenManual}
    title="Insertar imagen (transmutación WebP)"
  >
    🖼 URL
  </button>

  {#if isTransmuting}
    <span class="text-vault-accent text-[10px] tracking-widest uppercase animate-pulse ml-2">
      ◈ Transmutando…
    </span>
  {/if}
</div>

<!-- Editor TipTap -->
<div class="vault-editor-wrap rounded-t-none border-t-0" id="scriptorium-editor">
  <div bind:this={editorEl}></div>
</div>

<div class="vault-divider"></div>

<!-- Metadatos -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="scriptorium-metadata">
  <div>
    <label class="vault-label" for="meta-titulo">Título del registro</label>
    <input
      id="meta-titulo"
      type="text"
      class="vault-input"
      placeholder="Título histórico…"
      bind:value={titulo}
    />
  </div>
  <div>
    <label class="vault-label" for="meta-era">Era / Fecha</label>
    <input
      id="meta-era"
      type="text"
      class="vault-input"
      placeholder="Ej: 1492 · Siglo XV · ca. 1780"
      bind:value={era}
    />
  </div>
  <div>
    <label class="vault-label" for="meta-coords">Coordenadas</label>
    <input
      id="meta-coords"
      type="text"
      class="vault-input"
      placeholder="Ej: 40.4168° N, 3.7038° O"
      bind:value={coordenadas}
    />
  </div>
</div>
