import { ITEMS, type FinanzasView } from './FinanzasNav';

const WHATSAPP_NUMBER = '541126520967';

export function ReportarProblema({ view }: { view: FinanzasView }) {
  const label = ITEMS.find((item) => item.view === view)?.label ?? 'Finanzas';
  const mensaje = `Hola, necesito ayuda en Finanzas. Estaba en «${label}» y pasó esto: `;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-finAccent px-5 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-finAccentHover"
    >
      ¿Algo no funciona? Avisá por WhatsApp
    </a>
  );
}
