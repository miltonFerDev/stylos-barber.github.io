import { useState } from 'react';
import { finanzasSupabase } from '../presentation/client';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await finanzasSupabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError('No se pudo iniciar sesión. Revisá email y contraseña.');
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-textLight">Finanzas · Stylo's Barber</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-textMuted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-accentMuted bg-surface px-3 py-2 text-textLight"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-textMuted">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-accentMuted bg-surface px-3 py-2 text-textLight"
          />
        </div>
        {error && <p className="text-sm text-cupOrange">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition-colors hover:bg-accentHover disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
