import React from 'react';

interface GroupAccordionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function GroupAccordion({ title, subtitle, defaultOpen = false, children }: GroupAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-xl border border-accentMuted/20 overflow-hidden">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primaryLight/50 hover:bg-primaryLight/70 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-textLight font-bold text-sm">{title}</span>
          {subtitle && (
            <span className="text-textMuted text-xs">{subtitle}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-textMuted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 py-2 space-y-2 bg-primary/30">
          {children}
        </div>
      )}
    </div>
  );
}