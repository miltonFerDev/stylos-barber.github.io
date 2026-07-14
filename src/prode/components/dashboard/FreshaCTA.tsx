import React from 'react';
import { Card } from '../ui/Card';
import { FRESHA_BOOKING_URL } from '../../../config/site';
import { trackEvent } from '../../utils/analytics';

export function FreshaCTA() {
  function handleClick() {
    trackEvent('click_prode_reservar', { location: 'prode_dashboard' });
  }

  return (
    <a
      href={FRESHA_BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      onClick={handleClick}
    >
      <Card borderTopColor="cupCyan" className="bg-gradient-to-r from-cupCyan/12 to-transparent border-cupCyan/30 hover:border-cupCyan/50 hover:shadow-[0_0_24px_rgba(25,200,232,0.12)] transition-all group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cupCyan/15 flex items-center justify-center text-cupCyan shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-cupCyan/80 text-xs mb-0.5">Reservá en Fresha</p>
            <h3 className="text-textLight text-sm font-semibold">Stylo's Barber · Ituzaingó</h3>
          </div>
          <svg className="w-5 h-5 text-cupCyan/60 group-hover:translate-x-1 transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </Card>
    </a>
  );
}
