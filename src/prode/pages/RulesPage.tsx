import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';

export function RulesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-textLight text-2xl font-bold">Reglas y Premios</h1>
        <Link to="/prode" className="text-accent text-sm font-medium hover:underline">
          ← Volver
        </Link>
      </div>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">🎯 Sistema de Puntaje</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <p className="text-textLight font-medium">Resultado exacto</p>
              <p className="text-textMuted text-sm">Acertás el marcador exacto del partido</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <p className="text-textLight font-medium">Ganador correcto</p>
              <p className="text-textMuted text-sm">Acertás quién gana (o empate), pero no el marcador exacto</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold shrink-0">
              0
            </div>
            <div>
              <p className="text-textLight font-medium">Incorrecto / Sin predecir</p>
              <p className="text-textMuted text-sm">No acertás o no hacés la predicción</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">⚽ Predicciones</h2>
        <ul className="space-y-2 text-textMuted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            Podés predecir hasta el inicio de cada partido
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            Cuando empieza un partido, la predicción se bloquea automáticamente
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            Si no hacés la predicción, sumás 0 puntos para ese partido
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            Las predicciones son individuales y no se pueden ver las de otros jugadores
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">🏆 Rankings</h2>
        <ul className="space-y-2 text-textMuted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <strong className="text-textLight">Ranking semanal:</strong> por cada jornada de partidos
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <strong className="text-textLight">Ranking general:</strong> acumulado de todo el torneo
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            En caso de empate, gana el que tenga más resultados exactos
          </li>
        </ul>
      </Card>

      <Card className="border-amber-500/20">
        <h2 className="text-amber-400 text-lg font-bold mb-4">🎁 Premios</h2>
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏅</span>
              <p className="text-textLight font-bold">Premio por fecha</p>
            </div>
            <p className="text-textMuted text-sm">
              El primer puesto de cada jornada se lleva un <span className="text-amber-400 font-medium">50% de descuento</span> en cualquier servicio de Stylo's Barber.
            </p>
          </div>
          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏆</span>
              <p className="text-textLight font-bold">Premio final</p>
            </div>
            <p className="text-textMuted text-sm">
              El primer puesto del ranking general se lleva una <span className="text-amber-400 font-medium">gift card de $100.000</span>.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">👤 Perfil</h2>
        <ul className="space-y-2 text-textMuted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            Tu alias se genera automáticamente: iniciales + día y mes de nacimiento (ej: MF2401)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            No podés cambiar tu alias una vez creado
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            En los rankings públicos solo se muestra tu alias, nunca tu nombre real ni datos de contacto
          </li>
        </ul>
      </Card>
    </div>
  );
}
