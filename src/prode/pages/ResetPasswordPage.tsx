import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Card } from '../components/ui/Card';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const hasToken = window.location.hash.includes('access_token');

  React.useEffect(() => {
    if (!hasToken) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.has('access_token')) {
        setSuccess(true);
      }
    }
  }, [hasToken]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email?.value;
    
    if (!email) {
      setError('El email es obligatorio');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/prode/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError('Error al enviar el email de recuperación');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError('Error al cambiar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  if (success && !hasToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-textLight text-xl font-bold">Email enviado</h2>
          <p className="text-textMuted text-sm mt-2 mb-4">
            Revisá tu email y seguí el enlace para recuperar tu contraseña.
          </p>
          <Link
            to="/login"
            className="text-accent hover:text-accentHover transition-colors"
          >
            Volver al login
          </Link>
        </Card>
      </div>
    );
  }

  if (success && hasToken) {
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
          <h2 className="text-textLight text-xl font-bold">Contraseña actualizada</h2>
          <p className="text-textMuted text-sm mt-2 mb-4">
            Ya podés iniciar sesión con tu nueva contraseña.
          </p>
          <Link
            to="/login"
            className="text-accent hover:text-accentHover transition-colors"
          >
            Ir al login
          </Link>
        </Card>
      </div>
    );
  }

  if (hasToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-textLight text-2xl font-bold">Nueva contraseña</h1>
            <p className="text-textMuted text-sm mt-1">Ingresá tu nueva contraseña</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-textMuted text-sm mb-1">Nueva contraseña</label>
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
              disabled={submitting}
              className="w-full py-3 bg-accent text-white font-medium rounded-lg hover:bg-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-textLight text-2xl font-bold">Recuperar contraseña</h1>
          <p className="text-textMuted text-sm mt-1">Ingresá tu email para recibir el enlace</p>
        </div>

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label className="block text-textMuted text-sm mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="tu@email.com"
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-accent text-white font-medium rounded-lg hover:bg-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-textMuted text-sm hover:text-textLight transition-colors"
          >
            Volver al login
          </Link>
        </div>
      </Card>
    </div>
  );
}