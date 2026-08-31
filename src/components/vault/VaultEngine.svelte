<script>
  // VaultEngine.svelte — Orquestador principal del TGP-Vault

  import ModoAtanor from './ModoAtanor.svelte';
  import ModoScriptorium from './ModoScriptorium.svelte';

  /** URL del webhook de Cloud Run, inyectada desde la página Astro */
  export let webhookUrl = '';

  // ─── Estado global ─────────────────────────────────────────────
  let activeTab = 'atanor';                             // 'atanor' | 'scriptorium'
  let securityToken = '';
  let status = 'idle';                                  // 'idle'|'loading'|'success'|'error'
  let errorMessage = '';
  let tokenVisible = false;

  // Referencias a componentes hijos para llamar getPayload()
  let atanorRef;
  let scriptoriumRef;

  // ─── Lógica de envío ───────────────────────────────────────────
  async function transmitir() {
    // Guardia: clave de 4 dígitos
    const cleanToken = securityToken.trim();
    if (cleanToken.length !== 4) {
      errorMessage = 'Introduce la clave de seguridad de 4 dígitos.';
      status = 'error';
      return;
    }

    // Diagnóstico preventivo si la URL sigue siendo el placeholder por defecto
    if (!webhookUrl || webhookUrl.includes('your-cloud-run-service.run.app')) {
      errorMessage = `El webhook está en modo plantilla (URL placeholder). Configura tu URL real de Google Cloud Run en el archivo .env (PUBLIC_WEBHOOK_URL).`;
      status = 'error';
      return;
    }

    status = 'loading';
    errorMessage = '';

    try {
      let response;

      if (activeTab === 'atanor') {
        // FormData multipart/form-data con archivos
        const fd = atanorRef?.getPayload();
        if (!fd) throw new Error('No se pudo obtener el payload de Atanor.');
        fd.append('token', cleanToken);
        fd.append('mode', 'atanor');

        response = await fetch(webhookUrl, {
          method: 'POST',
          body: fd,               // browser establece Content-Type: multipart/form-data
        });

      } else {
        // JSON con metadatos + HTML del editor
        const data = scriptoriumRef?.getPayload();
        if (!data) throw new Error('No se pudo obtener el payload de Scriptorium.');

        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, token: cleanToken, mode: 'scriptorium' }),
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text || response.statusText}`);
      }

      status = 'success';

    } catch (err) {
      status = 'error';
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = `Error de conexión: No se pudo alcanzar el endpoint (${webhookUrl}). Verifica que el servidor de Cloud Run esté activo y acepte peticiones CORS.`;
      } else {
        errorMessage = err instanceof Error ? err.message : 'Error de red desconocido.';
      }
    }
  }

  function resetStatus() {
    status = 'idle';
    errorMessage = '';
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════
     TGP-VAULT — Shell Principal
═══════════════════════════════════════════════════════════════ -->
<div
  id="vault-engine"
  class="min-h-screen w-full flex flex-col items-center justify-start px-4 py-16"
  style="background-color: var(--color-vault-bg); color: var(--color-vault-text);"
>

  <!-- Cabecera -->
  <header class="w-full max-w-3xl mb-12 text-center" id="vault-header">
    <p class="text-[10px] uppercase tracking-[0.4em] text-vault-muted mb-4">
      The Great Puzzle Project
    </p>
    <h1
      class="font-bodoni text-3xl md:text-4xl mb-3"
      style="color: var(--color-vault-accent);"
    >
      TGP-Vault
    </h1>
    <p class="text-vault-muted text-xs tracking-widest uppercase">
      Centro de Operaciones · Ingesta Histórica
    </p>

    <!-- Indicador de conexión -->
    <div class="mt-6 flex items-center justify-center gap-2">
      <span
        class="inline-block w-1.5 h-1.5 rounded-full"
        style="background-color: var(--color-vault-success); box-shadow: 0 0 6px var(--color-vault-success);"
      ></span>
      <span class="text-vault-ghost text-[10px] tracking-[0.2em] uppercase font-mono">
        Enlace activo · {webhookUrl ? new URL(webhookUrl).hostname : '—'}
      </span>
    </div>
  </header>

  <!-- Panel principal -->
  <main
    class="w-full max-w-3xl border border-vault-border rounded-sm"
    style="background-color: var(--color-vault-surface);"
    id="vault-main-panel"
  >

    <!-- ── Tabs ─────────────────────────────────────────────── -->
    <div
      class="flex border-b border-vault-border"
      id="vault-tab-nav"
      role="tablist"
      aria-label="Modos del Vault"
    >
      <button
        id="tab-atanor"
        role="tab"
        aria-selected={activeTab === 'atanor'}
        aria-controls="panel-atanor"
        class="vault-tab"
        class:active={activeTab === 'atanor'}
        onclick={() => { activeTab = 'atanor'; resetStatus(); }}
      >
        ◈ Atanor
      </button>
      <button
        id="tab-scriptorium"
        role="tab"
        aria-selected={activeTab === 'scriptorium'}
        aria-controls="panel-scriptorium"
        class="vault-tab"
        class:active={activeTab === 'scriptorium'}
        onclick={() => { activeTab = 'scriptorium'; resetStatus(); }}
      >
        ✦ Scriptorium
      </button>

      <!-- Descripción contextual -->
      <span class="ml-auto px-4 self-center text-vault-ghost text-[10px] tracking-wider uppercase">
        {activeTab === 'atanor' ? 'Ingesta masiva' : 'Redacción y curaduría'}
      </span>
    </div>

    <!-- ── Contenido de tabs ────────────────────────────────── -->
    <div class="p-6 md:p-8">

      <!-- Panel Atanor -->
      {#if activeTab === 'atanor'}
        <div id="panel-atanor" role="tabpanel" aria-labelledby="tab-atanor">
          <ModoAtanor bind:this={atanorRef} />
        </div>
      {/if}

      <!-- Panel Scriptorium -->
      {#if activeTab === 'scriptorium'}
        <div id="panel-scriptorium" role="tabpanel" aria-labelledby="tab-scriptorium">
          <ModoScriptorium
            bind:this={scriptoriumRef}
            {webhookUrl}
            {securityToken}
          />
        </div>
      {/if}

      <!-- ── Zona de seguridad y envío ───────────────────────── -->
      <div class="vault-divider"></div>

      <div class="flex flex-col sm:flex-row items-start sm:items-end gap-4">

        <!-- Token de seguridad (Clave de 4 dígitos) -->
        <div class="flex-1">
          <div class="flex items-center justify-between mb-2">
            <label class="vault-label mb-0" for="vault-security-token">
              Clave de Acceso (4 Dígitos)
            </label>
            <span class="text-[10px] font-mono tracking-widest text-vault-ghost">
              {securityToken.length}/4
            </span>
          </div>
          <div class="relative">
            {#if tokenVisible}
              <input
                id="vault-security-token"
                type="text"
                maxlength="4"
                class="vault-input pr-10 font-mono tracking-[0.6em] text-center text-base"
                placeholder="••••"
                bind:value={securityToken}
                autocomplete="off"
                spellcheck="false"
              />
            {:else}
              <input
                id="vault-security-token"
                type="password"
                maxlength="4"
                class="vault-input pr-10 font-mono tracking-[0.6em] text-center text-base"
                placeholder="••••"
                bind:value={securityToken}
                autocomplete="off"
                spellcheck="false"
              />
            {/if}
            <button
              class="absolute right-3 top-1/2 -translate-y-1/2 text-vault-ghost
                     hover:text-vault-muted transition-colors text-xs"
              onclick={() => tokenVisible = !tokenVisible}
              tabindex="-1"
              aria-label={tokenVisible ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {tokenVisible ? '◉' : '◎'}
            </button>
          </div>
        </div>

        <!-- Botón transmitir -->
        <button
          id="vault-btn-transmit"
          class="vault-btn-transmit shrink-0"
          class:loading={status === 'loading'}
          disabled={status === 'loading'}
          onclick={transmitir}
          aria-label="Transmitir contenido a la Bóveda"
        >
          {#if status === 'loading'}
            ◈ Transmitiendo…
          {:else}
            Transmitir a Bóveda
          {/if}
        </button>
      </div>

      <!-- ── Feedback de estado ───────────────────────────────── -->
      {#if status === 'success'}
        <div class="vault-badge-success mt-4 flex items-center gap-3" id="vault-status-success">
          <span>✦</span>
          <span>Registro transmitido con éxito. El alquimista backend se encargará del resto.</span>
        </div>
      {/if}

      {#if status === 'error'}
        <div class="vault-badge-error mt-4 flex items-center gap-3" id="vault-status-error">
          <span>⚠</span>
          <span>{errorMessage || 'Error desconocido al conectar con el webhook.'}</span>
        </div>
      {/if}

    </div>
  </main>

  <!-- Pie de la Vault -->
  <footer class="mt-8 text-vault-ghost text-[10px] tracking-[0.2em] uppercase" id="vault-footer">
    TGP-Vault · Privado · {new Date().getFullYear()}
  </footer>

</div>
