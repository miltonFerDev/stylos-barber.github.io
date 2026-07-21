import React from 'react';
import { BallLoader } from '../components/ui/BallLoader';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FinalStatsCard } from '../components/dashboard/FinalStatsCard';
import { FinalRankingTable } from '../components/dashboard/FinalRankingTable';
import { FinalMessageCard } from '../components/dashboard/FinalMessageCard';
import { FreshaCTA } from '../components/dashboard/FreshaCTA';
import { getFinalStats, type FinalStats } from '../services/final-stats.service';
import { FINAL_CLOSING_MESSAGE } from '../config/finalization';
import { trackEvent } from '../utils/analytics';

export function FinalDashboardPage() {
  const [stats, setStats] = React.useState<FinalStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getFinalStats()
      .then((result) => {
        if (cancelled) return;
        setStats(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[FinalDashboardPage] getFinalStats error:', err);
        setError('No pudimos cargar los resultados finales.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!stats) return;
    trackEvent('prode_final_view', {
      total_predictions: stats.totalPredictions,
      exact_total: stats.exactTotal,
      partial_total: stats.partialTotal,
      participants: stats.participants,
    });
  }, [stats]);

  if (loading) {
    return <BallLoader size="lg" text="Cargando resultados finales..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-textLight text-2xl font-bold tracking-tight">
          Prode Mundial 2026 — Resultados finales
        </h1>
        <p className="text-textMuted text-sm mt-1">El Mundial terminó. Acá están los resultados finales.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FinalStatsCard
          label="Predicciones totales"
          value={stats.totalPredictions}
          accent="accent"
        />
        <FinalStatsCard
          label="Aciertos perfectos"
          value={stats.exactTotal}
          accent="emerald"
        />
        <FinalStatsCard
          label="Aciertos parciales"
          value={stats.partialTotal}
          accent="amber"
        />
      </div>

      <section>
        <h2 className="text-textLight text-lg font-bold tracking-tight mb-3">
          Tabla general final
        </h2>
        <FinalRankingTable entries={stats.ranking} />
      </section>

      <FinalMessageCard message={FINAL_CLOSING_MESSAGE} />

      <FreshaCTA />
    </div>
  );
}