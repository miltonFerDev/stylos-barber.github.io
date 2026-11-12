import { useEffect, useRef, useState } from 'react';

export type ComboboxOption = { id: string; label: string; group?: string };

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

/**
 * Combobox con búsqueda (mobile first): escribís y filtra.
 * Opcionalmente agrupa opciones por `group` (ej. Proveedores / Personas).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Elegí…',
  required = false,
}: {
  value: string;
  onChange: (id: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const groups: { group?: string; items: ComboboxOption[] }[] = [];
  for (const o of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.group === o.group) last.items.push(o);
    else groups.push({ group: o.group, items: [o] });
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className={inputClass}
        type="text"
        role="combobox"
        aria-expanded={open}
        placeholder={placeholder}
        required={required}
        value={open ? query : selected?.label ?? ''}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-finBorder bg-finSurface shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-base text-finMuted">Sin resultados</p>
          ) : (
            groups.map((g, i) => (
              <div key={g.group ?? i}>
                {g.group && (
                  <p className="sticky top-0 bg-finSurface px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-finMuted">
                    {g.group}
                  </p>
                )}
                {g.items.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="block w-full px-4 py-3 text-left text-base text-finText hover:bg-finAccent/10"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
