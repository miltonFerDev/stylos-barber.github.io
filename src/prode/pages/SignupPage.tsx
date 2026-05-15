import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, signupError, signupSuccess, loading: authLoading } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('El email es obligatorio');
      return;
    }
    if (!password) {
      setError('La contraseña es obligatoria');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, password);
      if (signupSuccess) {
        navigate('/onboarding', { state: { email } });
      }
    } catch (err: any) {
      setError(signupError || 'Error al registrarse');
    } finally {
      setSubmitting(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-textLight text-xl font-bold">¡Registro exitoso!</h2>
          <p className="text-textMuted text-sm mt-2 mb-4">
            Completa tu perfil para participar del Prode.
          </p>
          <Link
            to="/onboarding"
            className="inline-block py-3 px-6 bg-accent text-white font-medium rounded-lg hover:bg-accentHover transition-colors"
          >
            Completar perfil
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-textLight text-2xl font-bold">Crear cuenta</h1>
          <p className="text-textMuted text-sm mt-1">Registrate para participar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-textMuted text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="tu@email.com"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-textMuted text-sm mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="Mínimo 6 caracteres"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-textMuted text-sm mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="Repetí tu contraseña"
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || authLoading}
            className="w-full py-3 bg-accent text-white font-medium rounded-lg hover:bg-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-textMuted text-sm hover:text-textLight transition-colors"
          >
            ¿Ya tenés cuenta? <span className="text-accent">Iniciá sesión</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}