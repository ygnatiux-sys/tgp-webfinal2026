<script>
  // ModoAtanor.svelte — Ingesta masiva: Drag&Drop + textarea HTML

  /** @type {File[]} */
  let droppedFiles = [];
  let htmlPaste = '';
  let isDragging = false;
  let fileInput;

  const ACCEPTED_EXTENSIONS = ['.txt', '.pdf', '.mdoc'];
  const ICONS = { '.pdf': '📄', '.txt': '📝', '.mdoc': '📜' };

  /** @param {File} file */
  function getExt(file) {
    return '.' + file.name.split('.').pop().toLowerCase();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /** @param {FileList} files */
  function processFiles(files) {
    const valid = Array.from(files).filter(f =>
      ACCEPTED_EXTENSIONS.includes(getExt(f))
    );
    droppedFiles = [...droppedFiles, ...valid];
  }

  function onDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }
  function onDragLeave() { isDragging = false; }
  function onDrop(e) {
    e.preventDefault();
    isDragging = false;
    processFiles(e.dataTransfer.files);
  }
  function onFileInput(e) { processFiles(e.target.files); }

  /** @param {number} i */
  function removeFile(i) {
    droppedFiles = droppedFiles.filter((_, idx) => idx !== i);
  }

  /** @returns {FormData} */
  export function getPayload() {
    const fd = new FormData();
    droppedFiles.forEach(f => fd.append('files', f));
    fd.append('htmlPaste', htmlPaste);
    return fd;
  }
</script>

<!-- Zona Drag & Drop -->
<div
  id="vault-dropzone"
  class="vault-dropzone"
  class:dragging={isDragging}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  onclick={() => fileInput?.click()}
  role="button"
  tabindex="0"
  onkeydown={e => e.key === 'Enter' && fileInput?.click()}
  aria-label="Zona de carga de archivos"
>
  <input
    bind:this={fileInput}
    type="file"
    multiple
    accept=".txt,.pdf,.mdoc"
    class="hidden"
    onchange={onFileInput}
  />

  {#if isDragging}
    <span class="text-vault-accent text-2xl select-none">◈</span>
    <span class="text-vault-accent tracking-widest text-xs uppercase">Soltar para transmutar</span>
  {:else}
    <span class="text-vault-ghost text-2xl select-none">◈</span>
    <span class="text-vault-muted text-xs tracking-widest uppercase">
      Arrastra archivos o haz clic para seleccionar
    </span>
    <span class="text-vault-ghost text-[10px] tracking-widest uppercase">
      .txt · .pdf · .mdoc
    </span>
  {/if}
</div>

<!-- Cola de archivos -->
{#if droppedFiles.length > 0}
  <ul class="mt-4 w-full flex flex-col gap-2" id="vault-file-queue">
    {#each droppedFiles as file, i}
      <li class="flex items-center justify-between px-4 py-2 bg-vault-raised border border-vault-border rounded-sm text-xs text-vault-text">
        <span class="flex items-center gap-3">
          <span>{ICONS[getExt(file)] ?? '📎'}</span>
          <span class="font-mono truncate max-w-64">{file.name}</span>
          <span class="text-vault-muted">{formatSize(file.size)}</span>
        </span>
        <button
          class="text-vault-muted hover:text-vault-danger transition-colors duration-200 px-2"
          onclick={() => removeFile(i)}
          aria-label="Eliminar {file.name}"
        >✕</button>
      </li>
    {/each}
  </ul>
{/if}

<div class="vault-divider"></div>

<!-- Textarea HTML -->
<div>
  <label class="vault-label" for="vault-html-paste">
    Pegar HTML legado (Blogger / CMS antiguo)
  </label>
  <textarea
    id="vault-html-paste"
    class="vault-input font-mono resize-none"
    rows="12"
    placeholder="Pega aquí el código HTML de la entrada…"
    bind:value={htmlPaste}
    spellcheck="false"
  ></textarea>
  {#if htmlPaste.length > 0}
    <p class="text-right text-vault-ghost text-[10px] mt-1 tracking-wider">
      {htmlPaste.length.toLocaleString()} caracteres
    </p>
  {/if}
</div>
