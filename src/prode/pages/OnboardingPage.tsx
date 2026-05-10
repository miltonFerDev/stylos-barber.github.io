import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProfile, hasProfile } = useProfile();

  const [formData, setFormData] = React.useState({
    firstName: user?.user_metadata?.full_name?.split(' ')[0] ?? '',
    lastName: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? '',
    birthDate: '',
    whatsapp: '',
    acceptedRules: false,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [alias, setAlias] = React.useState('');

  React.useEffect(() => {
    if (hasProfile) {
      navigate('/');
    }
  }, [hasProfile, navigate]);

  React.useEffect(() => {
    if (formData.firstName && formData.lastName && formData.birthDate) {
      const initials = (formData.firstName[0] + formData.lastName[0]).toUpperCase();
      const date = new Date(formData.birthDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      setAlias(`${initials}${day}${month}`);
    }
  }, [formData.firstName, formData.lastName, formData.birthDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es obligatorio';
    if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es obligatorio';
    if (!formData.birthDate) newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    if (!formData.whatsapp.trim()) newErrors.whatsapp = 'El WhatsApp es obligatorio';
    if (!formData.acceptedRules) newErrors.acceptedRules = 'Debés aceptar las reglas';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      whatsapp: formData.whatsapp,
      email: user?.email ?? '',
    });

    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-3xl mx-auto mb-4">
          ⚽
        </div>
        <h1 className="text-textLight text-2xl font-bold">Completá tu perfil</h1>
        <p className="text-textMuted text-sm mt-1">
          Un paso más para empezar a predecir
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-textMuted text-sm mb-1">Nombre</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-xl px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="Tu nombre"
            />
            {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-textMuted text-sm mb-1">Apellido</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-xl px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="Tu apellido"
            />
            {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
          </div>

          <div>
            <label className="block text-textMuted text-sm mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-xl px-4 py-3 text-textLight focus:border-accent focus:outline-none"
            />
            {errors.birthDate && <p className="text-red-400 text-xs mt-1">{errors.birthDate}</p>}
          </div>

          <div>
            <label className="block text-textMuted text-sm mb-1">WhatsApp</label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full bg-primary/50 border border-accentMuted/30 rounded-xl px-4 py-3 text-textLight focus:border-accent focus:outline-none"
              placeholder="+54 9 11 2345-6789"
            />
            {errors.whatsapp && <p className="text-red-400 text-xs mt-1">{errors.whatsapp}</p>}
          </div>

          {alias && (
            <div className="p-4 bg-accent/10 rounded-xl border border-accent/20">
              <p className="text-textMuted text-xs mb-1">Tu alias (no editable)</p>
              <p className="text-accent text-xl font-bold">{alias}</p>
              <p className="text-textMuted text-xs mt-1">
                Se genera automáticamente con tus iniciales y fecha de nacimiento
              </p>
            </div>
          )}

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptedRules"
              checked={formData.acceptedRules}
              onChange={(e) => setFormData({ ...formData, acceptedRules: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-accentMuted accent-accent"
            />
            <label htmlFor="acceptedRules" className="text-textMuted text-sm">
              Acepto las{' '}
              <a href="/prode/reglas" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                reglas del prode
              </a>{' '}
              y los términos de participación
            </label>
          </div>
          {errors.acceptedRules && <p className="text-red-400 text-xs">{errors.acceptedRules}</p>}

          <Button type="submit" fullWidth>
            ¡Listo, empezar a predecir!
          </Button>
        </form>
      </Card>
    </div>
  );
}
