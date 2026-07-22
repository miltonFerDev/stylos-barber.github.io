export const HAIR_TYPES = ['Lacio', 'Ondulado', 'Rulos', 'Crespo', 'Fino', 'Grueso'] as const;
export const TOP_LENGTHS = ['Corto', 'Medio', 'Largo', 'Muy largo'] as const;
export const FADE_TYPES = [
  'Sin degradé',
  'Degradé bajo',
  'Degradé medio',
  'Degradé alto',
  'Taper',
  'Burst fade',
  'Skin fade',
] as const;
export const STYLES = [
  'Clásico',
  'Moderno',
  'Texturizado',
  'Prolijo',
  'Descontracturado',
  'Formal',
  'Urbano',
] as const;
export const MAINTENANCE = [
  'Bajo mantenimiento',
  'Mantenimiento medio',
  'Mantenimiento frecuente',
  'Requiere producto',
  'Ideal 3 semanas',
  'Ideal 4 semanas',
] as const;
export const BEARD = ['Sin barba', 'Barba corta', 'Barba media', 'Perfilado', 'Corte y barba'] as const;
export const GOALS = [
  'Mantener estilo',
  'Cambio de estilo',
  'Primera vez',
  'Trabajo/oficina',
  'Evento',
  'Todos los días',
] as const;

export const CATEGORY_DEFS = [
  { key: 'hairTypes' as const, label: 'Tipo de pelo', options: HAIR_TYPES },
  { key: 'topLengths' as const, label: 'Largo superior', options: TOP_LENGTHS },
  { key: 'fadeTypes' as const, label: 'Degradé / laterales', options: FADE_TYPES },
  { key: 'styles' as const, label: 'Estilo', options: STYLES },
  { key: 'maintenance' as const, label: 'Mantenimiento', options: MAINTENANCE },
  { key: 'beard' as const, label: 'Barba', options: BEARD },
  { key: 'goals' as const, label: 'Objetivo del corte', options: GOALS },
];