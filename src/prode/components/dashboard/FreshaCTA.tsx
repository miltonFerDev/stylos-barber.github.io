import React from 'react';
import { Card } from '../ui/Card';

export function FreshaCTA() {
  return (
    <a
      href="https://www.fresha.com/es/a/stylos-barber-ituzaingo-general-miguel-soler-398-jtabqara/booking?allOffer=true&menu=true"
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card className="bg-gradient-to-r from-accent/20 to-accent/5 border-accent/30 hover:border-accent/50 hover:shadow-accent transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-textLight font-bold">Reservar turno</h3>
            <p className="text-textMuted text-sm">Stylo's Barber · Ituzaingó</p>
          </div>
          <svg className="w-5 h-5 text-accent group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Card>
    </a>
  );
}
