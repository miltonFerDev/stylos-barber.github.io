import type { Cut } from '../../lib/cuts';

interface Props {
  cut: Cut;
  reserveUrl: string;
}

export default function CutCard({ cut, reserveUrl }: Props) {
  const visibleTags: string[] = [
    ...cut.fadeTypes,
    ...cut.styles,
    ...cut.topLengths,
    ...cut.hairTypes,
  ].slice(0, 4);

  return (
    <article
      className="group break-inside-avoid mb-4 rounded-xl overflow-hidden bg-surface border border-accentMuted border-t-2 border-t-accent hover:-translate-y-1 hover:shadow-cardHover scroll-mt-24 transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative overflow-hidden">
        <img
          src={cut.imageUrl}
          alt={cut.alt}
          loading="lazy"
          decoding="async"
          className="w-full h-auto object-cover"
          width={800}
          height={1067}
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-gothic font-semibold text-textLight leading-snug">
          {cut.title}
        </h3>
        <p className="text-sm text-textMuted mt-2 leading-relaxed">{cut.description}</p>

        {visibleTags.length > 0 && (
          <ul
            className="flex flex-wrap gap-1.5 mt-3"
            role="list"
            aria-label="Características del corte"
          >
            {visibleTags.map((t) => (
              <li
                key={t}
                className="inline-flex items-center text-xs font-medium bg-accent/10 text-accent rounded-full px-2 py-1"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        <a
          href={reserveUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics-event="click_corte_reservar"
          data-analytics-location="cortes-card"
          data-analytics-id={cut.slug}
          className="mt-4 inline-flex items-center gap-2 text-accent font-semibold hover:text-accentHover transition-colors motion-reduce:transition-none"
          aria-label={`Quiero algo parecido a ${cut.title}. Abre Fresha en una nueva pestaña`}
        >
          Quiero algo parecido
          <span aria-hidden="true">{'\u2192'}</span>
        </a>

        {cut.barber ? (
          <p className="mt-3 text-xs text-textFooter/70">Barber: {cut.barber}</p>
        ) : null}
      </div>
    </article>
  );
}