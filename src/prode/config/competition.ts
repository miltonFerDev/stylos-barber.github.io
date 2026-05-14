export const competition = {
  id: 'beta-liga-argentina',
  name: 'Prode Beta Liga Argentina',
  shortName: 'Prode Beta',
  subtitle: 'Semifinales - Torneo Apertura',
  rules: {
    exactScore: 3,
    correctWinner: 1,
    incorrect: 0,
    penaltyNote: 'Resultado a los 90 minutos. Penales no cuentan.',
  },
  prizes: {
    perMatchday: null,
    final: null,
    note: 'Competencia de prueba - sin premios reales',
  },
} as const;

export type Competition = typeof competition;