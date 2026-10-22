// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';

/**
 * Integración para mostrar la URL del CMS Svelte en la terminal al iniciar dev
 * @returns {import('astro').AstroIntegration}
 */
function svelteCmsBanner() {
  return {
    name: 'svelte-cms-banner',
    hooks: {
      'astro:server:start': ({ address }) => {
        const port = address.port || 4325;
        setTimeout(() => {
          // ANSI 94m: azul visible en terminales oscuras y claras
          console.log(`\x1b[90m┃\x1b[0m \x1b[1mSvelte CMS\x1b[0m \x1b[94mhttp://localhost:${port}/tgp-vault\x1b[0m`);
        }, 80);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://alternative.thegreatpuzzleproject.com',
  output: 'static',

  server: {
    port: 4325
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          // Silenciar advertencia de directiva interna use astro:head-inject en MDX v8
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
            (warning.message?.includes('astro:head-inject') || (warning.text && warning.text.includes('astro:head-inject')))
          ) {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
    server: {
      watch: {
        ignored: [
          '**/.astro/**',
          '**/.wrangler/**',
          '**/dist/**'
        ]
      }
    }
  },

  integrations: [mdx(), react(), svelte(), svelteCmsBanner()]
});