import { useEffect, useState } from 'react';
import type { CategoryKey } from '../../lib/cuts';
import { CATEGORY_DEFS } from '../../lib/cortes-enums';

export type FilterState = {
  hairTypes: string[];
  topLengths: string[];
  fadeTypes: string[];
  styles: string[];
  maintenance: string[];
  beard: string[];
  goals: string[];
};

export const EMPTY_FILTERS: FilterState = {
  hairTypes: [],
  topLengths: [],
  fadeTypes: [],
  styles: [],
  maintenance: [],
  beard: [],
  goals: [],
};

interface Props {
  filters: FilterState;
  onToggle: (category: CategoryKey, tag: string) => void;
  onClear: () => void;
  resultCount: number;
}

export default function CutFilters({ filters, onToggle, onClear, resultCount }: Props) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const activeCategories = (Object.keys(filters) as CategoryKey[]).filter(
    (k) => filters[k].length > 0,
  );
  const activeCount = activeCategories.reduce((sum, k) => sum + filters[k].length, 0);

  const allActiveTags = activeCategories.flatMap((cat) =>
    filters[cat].map((tag) => ({ cat, tag })),
  );

  useEffect(() => {
    if (!isPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPanelOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPanelOpen]);

  return (
    <section
      className="sticky top-[3.5rem] z-30 bg-surfaceLight/95 backdrop-blur border-b border-accentMuted"
      aria-label="Filtros de cortes"
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            aria-expanded={isPanelOpen}
            aria-controls="cortes-filter-panel"
            onClick={() => setIsPanelOpen((v) => !v)}
            data-analytics-event="filter_cortes_toggle"
            className="inline-flex items-center gap-2 text-sm font-gothic font-semibold text-primary hover:text-accent transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accent rounded px-1"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            Filtros
            {activeCount > 0 && (
              <span className="bg-accent text-surfaceLight rounded-full text-xs px-1.5 py-0.5 leading-none">
                {activeCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-3">
            <span
              className="text-xs text-textFooter/80"
              aria-live="polite"
              data-testid="result-count"
            >
              {resultCount} {resultCount === 1 ? 'corte' : 'cortes'}
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                data-analytics-event="filter_cortes_clear"
                className="text-xs font-medium text-accent hover:text-accentHover underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-accent rounded px-1"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {allActiveTags.length > 0 && (
          <ul
            className="flex flex-wrap gap-1.5 mt-2 max-h-[4.5rem] overflow-y-auto"
            role="list"
            aria-label="Filtros activos"
          >
            {allActiveTags.map(({ cat, tag }) => (
              <li key={`${cat}-${tag}`}>
                <button
                  type="button"
                  onClick={() => onToggle(cat, tag)}
                  aria-label={`Quitar filtro ${tag}`}
                  className="inline-flex items-center gap-1 bg-accent text-surfaceLight rounded-full px-2.5 py-1 text-xs font-medium hover:bg-accentHover transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {tag}
                  <span aria-hidden="true">{'\u00D7'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          id="cortes-filter-panel"
          hidden={!isPanelOpen}
          className="mt-3 max-h-[60vh] overflow-y-auto border-t border-accentMuted pt-2"
        >
          {CATEGORY_DEFS.map((cat) => {
            const active = filters[cat.key];
            return (
              <details
                key={cat.key}
                className="border-b border-accentMuted py-2 last:border-b-0"
              >
                <summary className="text-sm font-medium text-primary cursor-pointer list-none flex items-center justify-between hover:text-accent transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accent rounded px-1 [&::-webkit-details-marker]:hidden">
                  <span>{cat.label}</span>
                  <span className="text-xs text-textFooter/70">
                    {active.length > 0
                      ? `${active.length} activo${active.length === 1 ? '' : 's'}`
                      : '\u2014'}
                  </span>
                </summary>
                <ul
                  className="flex flex-wrap gap-1.5 mt-2"
                  role="group"
                  aria-label={cat.label}
                >
                  {cat.options.map((opt) => {
                    const pressed = active.includes(opt);
                    return (
                      <li key={opt}>
                        <button
                          type="button"
                          aria-pressed={pressed}
                          onClick={() => onToggle(cat.key, opt)}
                          data-analytics-event="filter_cortes_apply"
                          data-analytics-location={cat.key}
                          data-analytics-id={opt}
                          className={
                            'text-xs font-medium rounded-full px-3 py-1.5 min-h-[2rem] transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accent ' +
                            (pressed
                              ? 'bg-accent text-surfaceLight'
                              : 'bg-accent/5 text-primary hover:bg-accent/10')
                          }
                        >
                          {opt}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}