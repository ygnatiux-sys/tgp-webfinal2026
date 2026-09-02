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