// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';

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

  integrations: [mdx(), react(), svelte()]
});