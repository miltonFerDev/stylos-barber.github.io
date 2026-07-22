import { defineCollection, z } from 'astro:content';
import {
  BEARD,
  FADE_TYPES,
  GOALS,
  HAIR_TYPES,
  MAINTENANCE,
  STYLES,
  TOP_LENGTHS,
} from '../lib/cortes-enums';

const cortes = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(160),
      image: image(),
      alt: z.string(),
      hairTypes: z.array(z.enum(HAIR_TYPES)),
      topLengths: z.array(z.enum(TOP_LENGTHS)),
      fadeTypes: z.array(z.enum(FADE_TYPES)),
      styles: z.array(z.enum(STYLES)),
      maintenance: z.array(z.enum(MAINTENANCE)),
      beard: z.array(z.enum(BEARD)),
      goals: z.array(z.enum(GOALS)),
      recommendedFor: z.string().optional(),
      notRecommendedIf: z.string().optional(),
      barber: z.string().optional(),
      order: z.number().default(0),
      isPublished: z.boolean().default(true),
    }),
});

export const collections = { cortes };