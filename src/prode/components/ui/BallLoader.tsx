import React from 'react';
import triondaImg from '../../../../assets/TRIONDA.png';

interface BallLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function BallLoader({ size = 'md', text, className = '' }: BallLoaderProps) {
  const sizes = {
    sm: { ball: 'w-8 h-8', shadow: 'w-5 h-1.5', container: 'py-6' },
    md: { ball: 'w-12 h-12', shadow: 'w-7 h-2', container: 'py-10' },
    lg: { ball: 'w-16 h-16', shadow: 'w-9 h-2.5', container: 'py-12' },
  };

  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center ${s.container} ${className}`}>
      <div className="relative flex flex-col items-center">
        <img
          src={typeof triondaImg === 'string' ? triondaImg : (triondaImg as { src: string }).src}
          alt="Cargando"
          className={`${s.ball} object-contain animate-ballBounce`}
          loading="eager"
        />
        <div
          className={`${s.shadow} rounded-full bg-black/20 animate-shadowPulse mt-1`}
        />
      </div>
      {text && (
        <p className="text-textMuted text-sm mt-4 font-medium">{text}</p>
      )}
    </div>
  );
}
