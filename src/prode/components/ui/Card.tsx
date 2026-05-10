import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

export function Card({ children, className = '', onClick, href }: CardProps) {
  const baseStyles = 'bg-primaryLight/50 backdrop-blur-sm rounded-2xl border border-accentMuted/30 p-5 transition-all duration-200';
  
  if (href) {
    return (
      <a
        href={href}
        className={`${baseStyles} block hover:border-accent/50 hover:shadow-cardHover hover:-translate-y-0.5 ${className}`}
      >
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseStyles} text-left w-full hover:border-accent/50 hover:shadow-cardHover hover:-translate-y-0.5 cursor-pointer ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={`${baseStyles} ${className}`}>
      {children}
    </div>
  );
}
