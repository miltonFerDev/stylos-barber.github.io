import React from 'react';

type BorderTopColor = 'cupGreen' | 'cupGold' | 'cupOrange' | 'cupPink' | 'cupCyan' | 'cupPurple' | 'cupLime' | 'cupYellow' | undefined;

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  borderTopColor?: BorderTopColor;
}

const borderTopColorClasses: Record<NonNullable<BorderTopColor>, string> = {
  cupGreen: 'border-t-cupGreen',
  cupGold: 'border-t-cupGold',
  cupOrange: 'border-t-cupOrange',
  cupPink: 'border-t-cupPink',
  cupCyan: 'border-t-cupCyan',
  cupPurple: 'border-t-cupPurple',
  cupLime: 'border-t-cupLime',
  cupYellow: 'border-t-cupYellow',
};

export function Card({ children, className = '', onClick, href, borderTopColor }: CardProps) {
  const baseStyles = 'bg-gradient-to-b from-[#383653]/96 to-[#302E46]/96 backdrop-blur-sm rounded-2xl border border-white/[0.06] shadow-cardProde transition-all duration-200 p-5';

  const borderTopClass = borderTopColor ? borderTopColorClasses[borderTopColor] : '';

  if (href) {
    return (
      <a
        href={href}
        className={`${baseStyles} ${borderTopClass} block hover:border-white/[0.12] hover:shadow-cardHover hover:-translate-y-0.5 ${className}`}
      >
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseStyles} ${borderTopClass} text-left w-full hover:border-white/[0.12] hover:shadow-cardHover hover:-translate-y-0.5 cursor-pointer ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={`${baseStyles} ${borderTopClass} ${className}`}>
      {children}
    </div>
  );
}
