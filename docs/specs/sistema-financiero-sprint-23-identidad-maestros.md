# Spec — Sistema financiero sprint 23: fundación de identidad y maestros (migration 021)

> Habilita la primera mutación (E5-03, alta de obligación) cerrando tres huecos:
> trigger de `public.users`, seed de `roles` y seed de maestros (`persons`, `categories`, `result_lines`).
> No es dato productivo: maestros de ejemplo. Sin UI ni servicio nuevos.

## 1. Problema

`obligations.created_by NOT NULL REFERENCES public.users(id)` exige una fila en `public.users`, pero no existe trigger que la cree al registrarse. Además `roles` y los maestros que referencia el alta de obligación están vacíos.

## 2. Objetivo

Migration `021_finanzas_identity_maestros.sql`:
1. Trigger `handle_new_user` que crea `public.users` (bare, sin rol) al insertar en `auth.users`.
2. Seed de `roles` (DIRECCION, TESORERIA, CONTADOR, ADMIN_TECNICO).
3. Seed de maestros de ejemplo: `persons`, `categories`, `result_lines`.

## 3. Alcance incluido / excluido

**Incluido:** trigger, seed de roles, seed de 2 persons, 3 categories, 4 result_lines. Idempotente (`ON CONFLICT`).

**Excluido:** asignación de roles (es manual/por admin: el trigger no auto-grantea DIRECCION por seguridad), `ledger_accounts`, la UI y el endpoint de E5-03, datos productivos.

## 4. Decisión de seguridad

- El trigger crea `public.users` **sin roles**. La asignación de DIRECCION/TESORERIA es un paso manual (Dashboard / futuro panel admin), no automático, para no auto-grantear permisos a cualquier registro nuevo.

## 5. Archivos

| Archivo | Cambio |
|---|---|
| `supabase/migrations/021_finanzas_identity_maestros.sql` | Crear. |

## 6. Criterios de aceptación

- El trigger es `SECURITY DEFINER` + `SET search_path = public`, idempotente (`DROP TRIGGER IF EXISTS`).
- `roles` queda con los 4 códigos únicos; maestros con `ON CONFLICT (id) DO NOTHING`.
- No toca `src/`, landing, `/prode`, `/escuela`.
- Al registrar un usuario nuevo en Supabase auth, se crea su fila en `public.users` automáticamente.

## 7. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Auto-grantear admin a cualquiera | No se asignan roles en el trigger; paso manual. |
| `auth.users.email` nulo (solo phone) | La app usa Google OAuth (email siempre presente); si apareciera null, el insert falla y se ve en logs. |
| Maestros de ejemplo vs productivos | Nombres genéricos y comentario en la migration; los reales van por E9 o por el alta guiada. |
