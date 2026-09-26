import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const ensayosCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/ensayos" }),
  schema: z.object({
    title: z.string(),
    abstract: z.string().optional(),
    volanta: z.string().optional(),
    layoutMode: z.string().optional(),
    powertype: z.string().optional(),
    date: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    coverImage: z.string().optional(),
    heroUrl: z.string().optional(),
    category: z.string().optional(),
    themeColor: z.string().optional(),
    draft: z.boolean().default(false).optional()
  })
});

const seriesHemerotecaCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx,json}", base: "./src/content/series_hemeroteca" }),
  schema: z.object({
    title: z.string(),
    subtitulo: z.string().optional(),
    era: z.string().optional(),
    urgencia: z.enum(['alta', 'media', 'baja']).default('alta'),
    paletteTheme: z.enum(['terracota-mostaza', 'mostaza-terracota', 'editorial-dark']).default('terracota-mostaza'),
    quoteDestacada: z.string().optional(),
    autores: z.array(z.string()).optional(),
    flipbookSlug: z.string().optional(),
    coverImageUrl: z.string().optional(),
  })
});

export const collections = {
  'ensayos': ensayosCollection,
  'series_hemeroteca': seriesHemerotecaCollection,
};
