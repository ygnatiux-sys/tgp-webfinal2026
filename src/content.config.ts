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
    category: z.string().optional(),
    themeColor: z.string().optional()
  })
});

export const collections = {
  'ensayos': ensayosCollection,
};
