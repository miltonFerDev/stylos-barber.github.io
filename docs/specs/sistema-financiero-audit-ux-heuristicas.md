# Audit UX — Finanzas (contra las 10 heurísticas de Nielsen)

> Fase **Audit** (solo lectura). Fecha: 2026-10-27. Alcance: las 11 pantallas de `/finanzas` + shell/nav. No se audita landing ni Prode. No se tocó código.

## Resumen ejecutivo (ranked)

| # | Hallazgo | Heurística | Severidad |
|---|---|---|---|
| 1 | **Sin "ir para atrás"** salvo Pagos. Transferencias, Ingresos, Comisiones, Fondos, Inversiones, Cierre son irreversibles. | H3 | 🔴 (ya spec sprint 42) |
| 2 | **Submits de dinero sin confirmación ni deshacer** (Fondos/Ingresos/Transferencias). | H3 + H5 | 🔴 |
| 3 | **Jerga contable sin traducir**: "Devengar" (Comisiones), "Ajuste vs Explicada" (Cierre). | H2 | 🟡 |
| 4 | **Comisiones devengo uno-por-uno**: falta carga batch del día. | H7 | 🟡 |
| 5 | **Inversiones sin feedback "en vuelo"**: botones no se deshabilitan → doble click. | H1 + H5 | 🟡 |
| 6 | **7 pantallas duplican el boilerplate de fetch** (solo Tablero/Agenda usan `useFinanzasFetch`). | H4 | 🟡 (deuda técnica) |
| 7 | **Ayuda inconsistente**: solo Fondos/Inversiones linkean la wiki; faltan recetas (comisiones, revertir). | H10 | 🟡 |
| 8 | **Errores sin "cómo salir"**: dicen qué pasó, no cómo resolverlo. | H9 | 🟡 |
| 9 | **Token expirado sin salida**: "Iniciá sesión" sin botón de re-login. | H1 | 🟢 |
| 10 | `formatMoney` inconsistente (Intl vs `$X.toFixed(2)` manual). | H4 | 🟢 |

## Por heurística

### H1 — Visibilidad del estado del sistema
- ✅ loading/success/error en casi todas; botones "Guardando…/Entrando…".
- 🟡 **Inversiones**: `onCreate/onEvaluar/onDecidir/onPagar` sin estado `submitting` → sin spinner ni disabled.
- 🟢 **Tablero/Agenda** con token vencido: "Iniciá sesión para ver" sin botón de re-login.

### H2 — Relación con el mundo real
- ✅ "Barbero", "Comisión", "Pesos (ARS)", "Vencidas/Próximas", "Saldo real vs teórico".
- 🟡 **"Devengar"** → sugerencia: "Registrar la comisión del día (lo que le debo al barbero)".
- 🟡 **"Ajuste" vs "Explicada"** → "Corregir la caja" vs "Dejar constancia (no tocar saldo)".
- 🟡 **"Aplicado a obligaciones" / "Egreso directo"** tiene hint pero sigue técnico.

### H3 — Control y libertad del usuario
- 🔴 El hueco central: sin reversión salvo Pagos → **spec sprint 42**.
- ✅ Forms inline con "Cancelar" (Inversiones, Comisiones pago, Cierre resolver, Pagos revertir).
- 🟡 Forms principales (Fondos/Ingresos/Transferencias) sin "Cancelar/Limpiar".

### H4 — Consistencia y estándares
- ✅ `inputClass`, helper `field()`, colores `fin*`, `min-h-12`, mismo patrón de card en todas. Muy parejo.
- 🟡 **Fetch duplicado** en 7 pantallas; solo 2 usan `useFinanzasFetch`.
- 🟢 `formatMoney` inconsistente.
- 🟢 `403` manejado distinto (Cierre tiene estado propio; el resto "No se pudo cargar" genérico).

### H5 — Prevención de errores
- ✅ botones `disabled` hasta validar; "Restante por distribuir"; filtro origen≠destino; `max` en montos aplicados.
- 🔴/🟡 **Falta confirmación en submits de dinero** (se apoya en reversión, aún inexistente).
- 🟡 **Inversiones** sin `disabled` → doble submit.

### H6 — Reconocimiento antes que memorizar
- ✅ labels explícitos, badges, opciones visibles.
- 🟡 **Inversiones**: flujo (Borrador→Evaluada→Aprobada→Pagada) sin indicador de progresión.

### H7 — Flexibilidad y eficiencia
- ✅ defaults (fecha=hoy, período=primer abierto), montos pre-rellenados en Pagar.
- 🟡 **Comisiones uno-por-uno** → falta carga batch del día.
- 🟢 sin "repetir día anterior".

### H8 — Estética y minimalismo
- ✅ paleta clara, limpia, espaciado consistente.
- 🟡 **RegistrarPago** (2 modos + historial + reversión) y **Inversiones** (form + lista + 2 forms) son las más densas.

### H9 — Errores claros y accionables
- ✅ mensajes en español, `role="alert"`, se muestra el error del servidor.
- 🟡 **Sin sugerencia de recuperación** ("abrí un período", etc.).
- ✅ Login no filtra qué falló (seguridad).

### H10 — Ayuda y documentación
- ✅ wiki existe; Fondos/Inversiones linkean conceptos.
- 🟡 **Inconsistente**: Ingresos, Comisiones, Transferencias, Cierre, Pagar, Agenda, Tablero no linkean.
- 🟡 **Falta receta** de "comisiones a barberos" y de "cómo revertir".

## Acciones recomendadas (orden)

1. **Spec 42 (reversibilidad)** — ya escrito; fix del hallazgo #1 y base del #2.
2. **Confirmación de submits de dinero** — barato, alto impacto.
3. **Traducir jerga** ("Devengar", "Ajuste/Explicada").
4. **Carga batch de comisiones del día**.
5. **Feedback en Inversiones** (disabled + "procesando…").
6. **Unificar fetch con `useFinanzasFetch`** + linkear wiki en todas.

## Notas de alcance

- Audit por lectura de código, no de pantallas renderizadas (no se verificó en navegador).
- No se auditó landing ni Prode.
- Hallazgos #5 y #6 deducidos de lectura estática; conviene confirmar en navegador antes de priorizar.
