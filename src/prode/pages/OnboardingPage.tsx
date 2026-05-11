import React from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '../components/ui/PhoneInput.css';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProfile, hasProfile } = useProfile(user?.id ?? null);

  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    whatsapp: '',
    acceptedRules: false,
  });

  React.useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || meta.given_name || meta.full_name?.split(' ')[0] || '',
        lastName: prev.lastName || meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || '',
      }));
    }
  }, [user]);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [alias, setAlias] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

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
    if (formData.whatsapp.trim().length < 8) newErrors.whatsapp = 'Ingres un nmero vlido';
    if (!formData.acceptedRules) newErrors.acceptedRules = 'Deb aceptar las reglas';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const profile = await createProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        whatsapp: formData.whatsapp,
        email: user?.email ?? '',
      });

      if (profile) {
        navigate('/');
      } else {
        setSubmitError('Error al crear el perfil. Intenta de nuevo.');
      }
    } catch (e) {
      setSubmitError('Error al crear el perfil. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const nameFromGoogle = !!(user?.user_metadata?.given_name || user?.user_metadata?.full_name);

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-3xl mx-auto mb-4">
          ⚽
        </div>
        <h1 className="text-textLight text-2xl font-bold">Complet tu perfil</h1>
        <p className="text-textMuted text-sm mt-1">
          Un paso ms para empezar a predecir
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
            {nameFromGoogle && (
              <p className="text-textMuted text-xs mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                Desde tu cuenta de Google — pod editarlo
              </p>
            )}
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
            <PhoneInput
              country={'ar'}
              value={formData.whatsapp}
              onChange={(phone) => setFormData({ ...formData, whatsapp: phone })}
              enableSearch
              preferredCountries={['ar', 'br', 'uy', 'cl', 'py', 'bo', 'pe', 'co', 've', 'ec', 'mx', 'es', 'us']}
              placeholder="11 2345-6789"
              inputProps={{
                name: 'whatsapp',
                required: true,
              }}
            />
            {errors.whatsapp && <p className="text-red-400 text-xs">{errors.whatsapp}</p>}
          </div>

          {alias && (
            <div className="p-4 bg-accent/10 rounded-xl border border-accent/20">
              <p className="text-textMuted text-xs mb-1">Tu alias (no editable)</p>
              <p className="text-accent text-xl font-bold">{alias}</p>
              <p className="text-textMuted text-xs mt-1">
                Se genera automticamente con tus iniciales y fecha de nacimiento
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
              y los trminos de participacin
            </label>
          </div>
          {errors.acceptedRules && <p className="text-red-400 text-xs">{errors.acceptedRules}</p>}

          {submitError && <ErrorMessage message={submitError} />}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Guardando...' : 'Listo, empezar a predecir!'}
          </Button>
        </form>
      </Card>
    </div>
  );
}