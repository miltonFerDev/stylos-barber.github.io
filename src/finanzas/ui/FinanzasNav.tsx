import { useEffect, useState } from 'react';
import { finanzasSupabase } from '../presentation/client';

export type FinanzasView = 'tablero' | 'agenda' | 'nueva' | 'pagar' | 'cierre' | 'fondos' | 'inversiones';

const ITEMS: { view: FinanzasView; label: string }[] = [
  { view: 'tablero', label: 'Tablero' },
  { view: 'agenda', label: 'Agenda' },
  { view: 'nueva', label: 'Nueva obligación' },
  { view: 'pagar', label: 'Pagar' },
  { view: 'cierre', label: 'Cierre' },
  { view: 'fondos', label: 'Fondos' },
  { view: 'inversiones', label: 'Inversiones' },
];

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-base font-semibold transition-colors cursor-pointer ${
        active ? 'bg-finAccent text-white' : 'text-finMuted hover:bg-finBorder/60 hover:text-finText'
      }`}
    >
      {label}
    </button>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function FinanzasNav({ view, onChange }: { view: FinanzasView; onChange: (v: FinanzasView) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [view]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const items = ITEMS.map((item) => (
    <NavItem
      key={item.view}
      label={item.label}
      active={view === item.view}
      onClick={() => onChange(item.view)}
    />
  ));

  const footer = (
    <>
      <a
        href="/finanzas/ayuda"
        className="flex w-full items-center rounded-lg px-3 py-2.5 text-base font-semibold text-finMuted transition-colors hover:bg-finBorder/60 hover:text-finText cursor-pointer"
      >
        Ayuda
      </a>
      <button
        type="button"
        onClick={() => finanzasSupabase.auth.signOut()}
        className="flex w-full items-center rounded-lg px-3 py-2.5 text-base font-semibold text-finMuted transition-colors hover:bg-finBorder/60 hover:text-finDanger cursor-pointer"
      >
        Salir
      </button>
    </>
  );

  return (
    <>
      {/* Sidebar de escritorio */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-finBorder bg-finSurface md:flex">
        <div className="px-4 pb-2 pt-4">
          <span className="text-lg font-bold text-finText">Finanzas</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Principal">
          {items}
        </nav>
        <div className="space-y-1 border-t border-finBorder px-3 py-3">{footer}</div>
      </aside>

      {/* Header mobile con hamburguesa */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-finBorder bg-finSurface px-2 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="flex min-h-12 items-center justify-center rounded-lg px-3 text-finText transition-colors hover:bg-finBorder/60 cursor-pointer"
        >
          <MenuIcon />
        </button>
        <span className="text-lg font-bold text-finText">Finanzas</span>
        <span className="w-12" aria-hidden="true" />
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-finSurface shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-lg font-bold text-finText">Finanzas</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex min-h-12 items-center justify-center rounded-lg px-3 text-finMuted transition-colors hover:text-finText cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Principal">
              {items}
            </nav>
            <div className="space-y-1 border-t border-finBorder px-3 py-3">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
