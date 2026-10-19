import { useEffect, useState } from 'react';
import { finanzasSupabase } from '../presentation/client';

export type FetchStatus = 'loading' | 'unauthenticated' | 'error' | 'ready';

/**
 * Patrón común de las pantallas de finanzas: leer sesión, obtener el access_token
 * y pedir el endpoint server-side. Los datos financieros nunca se consultan a
 * Supabase desde la UI; solo se usa la sesión para armar el Bearer.
 */
export function useFinanzasFetch<T>(path: string): { status: FetchStatus; data: T | null } {
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await finanzasSupabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      if (!token) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }

      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });

      if (res.status === 401) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }

      const body = await res.json();
      if (!cancelled) {
        setData(body);
        setStatus('ready');
      }
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { status, data };
}
