import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const episodeSchema = z.object({
  title: z.string(),
  episode: z.number().int().positive(),
  publishedAt: z.coerce.date(),
  description: z.string(),
  readingMinutes: z.number().int().positive(),
  status: z.enum(["published", "draft"]).default("published")
});

const episodesKo = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/episodes-ko" }),
  schema: episodeSchema
});

const episodesEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/episodes-en" }),
  schema: episodeSchema
});

export const collections = {
  episodesKo,
  episodesEn
};
