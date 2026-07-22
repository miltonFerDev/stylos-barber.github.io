import { useMemo, useState } from 'react';
import type { CategoryKey, Cut } from '../../lib/cuts';
import CutCard from './CutCard';
import CutFilters, { EMPTY_FILTERS, type FilterState } from './CutFilters';

interface Props {
  cuts: Cut[];
  reserveUrl: string;
}

function matchesCut(cut: Cut, filters: FilterState): boolean {
  const activeCategories = (Object.keys(filters) as CategoryKey[]).filter(
    (k) => filters[k].length > 0,
  );
  if (activeCategories.length === 0) return true;
  return activeCategories.every((cat) => {
    const cutTags = cut[cat] as readonly string[];
    const activeTags = filters[cat];
    return cutTags.some((t) => activeTags.includes(t));
  });
}

export default function CortesGallery({ cuts, reserveUrl }: Props) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const filtered = useMemo(() => cuts.filter((c) => matchesCut(c, filters)), [cuts, filters]);

  const toggle = (category: CategoryKey, tag: string) => {
    setFilters((prev) => {
      const current = prev[category];
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, [category]: next };
    });
  };

  const clear = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="w-full" data-analytics-section-view="cortes_gallery">
      <CutFilters
        filters={filters}
        onToggle={toggle}
        onClear={clear}
        resultCount={filtered.length}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-textMuted text-lg font-gothic">
              No encontramos cortes con esos filtros.
            </p>
            <p className="text-textFooter/70 text-sm mt-1">
              Probá con menos filtros o reservá un turno para asesorarte.
            </p>
            <a
              href={reserveUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="click_corte_reservar"
              data-analytics-location="cortes-empty"
              data-analytics-id="empty-cta"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-card bg-accent text-surfaceLight font-semibold hover:bg-accentHover transition-colors motion-reduce:transition-none"
            >
              Reservá igual
              <span aria-hidden="true">{'\u2192'}</span>
            </a>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [&>*]:break-inside-avoid [&>*]:mb-4">
            {filtered.map((c) => (
              <CutCard key={c.slug} cut={c} reserveUrl={reserveUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}