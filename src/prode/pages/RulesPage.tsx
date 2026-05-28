import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { worldCup2026 } from '../config/competition';

export function RulesPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-textLight text-2xl font-extrabold tracking-tight">Reglas y Premios</h1>
          <p className="text-textMuted text-sm mt-1">Cómo funcionan las predicciones y los rankings</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-accent text-sm font-medium hover:text-accentHover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </Link>
      </div>

      <Card className="border-amber-500/20">
          <h2 className="text-amber-400 text-lg font-bold mb-2">Mundial 2026</h2>
          <p className="text-textMuted text-sm">
            Participá del Prode del Mundial 2026. Predecí los resultados y competí por premios en cada fase.
          </p>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">Sistema de Puntaje</h2>
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
              <p className="text-textMuted text-sm">No acertás o no hiciste la predicción</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">Predicciones</h2>
        <ul className="space-y-2 text-textMuted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            Podés predecir hasta el inicio de cada partido
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            Cuando empieza un partido, la predicción se bloquea automáticamente
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            Si no hacés la predicción, sumás 0 puntos para ese partido
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            Las predicciones son individuales y no se pueden ver las de otros jugadores
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            <strong className="text-textLight">Resultado a los 90 minutos.</strong> Penales no cuentan.
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">Rankings</h2>
        <ul className="space-y-2 text-textMuted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            <strong className="text-textLight">Ranking por fase:</strong> el 1° de cada fase gana {worldCup2026.prizes.perPhase}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            Las fases rankeables son: Fecha 1, Fecha 2, Fecha 3, 16avos, Octavos, Cuartos, Semifinales, 3er puesto y Final
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            <strong className="text-textLight">Ranking general:</strong> acumulado de todo el torneo
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            En caso de empate, gana el que tenga más resultados exactos
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-textLight text-lg font-bold mb-4">Perfil</h2>
        <ul className="space-y-2 text-textMuted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            Tu alias se genera automáticamente: iniciales + día y mes de nacimiento (ej: MF2401)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            No podés cambiar tu alias una vez creado
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">*</span>
            En los rankings públicos solo se muestra tu alias, nunca tu nombre real ni datos de contacto
          </li>
        </ul>
      </Card>
    </div>
  );
}
