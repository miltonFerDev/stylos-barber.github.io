import { getCollection } from 'astro:content';

export type Cut = {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  alt: string;
  hairTypes: readonly string[];
  topLengths: readonly string[];
  fadeTypes: readonly string[];
  styles: readonly string[];
  maintenance: readonly string[];
  beard: readonly string[];
  goals: readonly string[];
  recommendedFor?: string;
  notRecommendedIf?: string;
  barber?: string;
  order: number;
  isPublished: boolean;
};

export type CategoryKey =
  | 'hairTypes'
  | 'topLengths'
  | 'fadeTypes'
  | 'styles'
  | 'maintenance'
  | 'beard'
  | 'goals';

export async function getAllCuts(): Promise<Cut[]> {
  const entries = await getCollection('cortes');
  return entries
    .filter((e) => e.data.isPublished)
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      slug: e.slug,
      title: e.data.title,
      description: e.data.description,
      imageUrl: e.data.image.src,
      alt: e.data.alt,
      hairTypes: e.data.hairTypes,
      topLengths: e.data.topLengths,
      fadeTypes: e.data.fadeTypes,
      styles: e.data.styles,
      maintenance: e.data.maintenance,
      beard: e.data.beard,
      goals: e.data.goals,
      recommendedFor: e.data.recommendedFor,
      notRecommendedIf: e.data.notRecommendedIf,
      barber: e.data.barber,
      order: e.data.order,
      isPublished: e.data.isPublished,
    }));
}

export async function getCutBySlug(slug: string): Promise<Cut | null> {
  const all = await getAllCuts();
  return all.find((c) => c.slug === slug) ?? null;
}