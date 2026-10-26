# Spec — Sistema financiero sprint 33: rol DEV (inspección total)

> Conveniencia de desarrollo: un rol que atraviesa todos los permisos para poder inspeccionar la app completa sin asignar múltiples roles.

## 1. Problema

Los permisos están repartidos entre roles (p. ej. `RECONCILE_ACCOUNT` solo `TESORERIA`, `APPROVE_INVESTMENT` solo `DIRECCION`, `VIEW_BALANCES` no `ADMIN_TECNICO`). Para desarrollo no hay un rol único que vea y pueda todo.

## 2. Objetivo

Agregar el rol `DEV` que **bypasea toda verificación**, tanto en la capa de aplicación (`hasPermission`) como en RLS (`has_role`), de modo que un usuario con `DEV` vea y ejecute todo.

## 3. Alcance incluido

- `RoleCode` + `FINANCE_ROLE_CODES` + `'DEV'`.
- `hasPermission`: si el usuario tiene `DEV`, retorna `true` para cualquier acción.
- Migración `023`: seed del rol `DEV` + `has_role()` devuelve `true` para usuarios con `DEV`.
- Test de `hasPermission` para DEV.

## 4. Alcance excluido

- Asignación automática (se asigna manualmente vía `user_roles`).
- UI de gestión de roles / asignación.
- Delegación del rol DEV.
- Agregar `DEV` a `RBAC_MATRIX` (innecesario por el short-circuit).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Bypass en dos capas | `hasPermission` (app) y `has_role` (RLS) short-circuitean para `DEV`. |
| 2 | No tocar `RBAC_MATRIX` | El short-circuit evita enumerar `DEV` en las ~20 acciones. |
| 3 | Asignación manual | `INSERT INTO user_roles (user_id, role_id)` con el id del rol `DEV`. |
| 4 | Producción | `DEV` es solo para desarrollo; documentar que no debe asignarse en producción. |

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | `RoleCode` += `'DEV'`. |
| `src/finanzas/domain/roles.ts` | `FINANCE_ROLE_CODES` += `'DEV'`. |
| `src/finanzas/domain/permissions.ts` | `hasPermission` short-circuit `DEV`. |
| `src/finanzas/domain/__tests__/permissions.test.ts` | Test: `DEV` puede `RECONCILE_ACCOUNT` y `APPROVE_INVESTMENT`. |
| `supabase/migrations/023_dev_role.sql` | Seed rol `DEV` + `has_role()` con short-circuit `DEV`. |

## 7. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- `hasPermission(['DEV'], <cualquier acción>) === true`.
- `has_role(<cualquier código>)` es `true` para un usuario con `DEV` (verificable en Supabase tras `db push`).
- Un usuario con solo `DEV` ve todos los tabs y puede conciliar, revertir, aprobar inversión, etc.

## 8. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| `DEV` en producción | Cualquiera con el rol ve/todo. Documentar "solo dev"; no se auto-asigna (trigger `handle_new_user` no lo crea). |
| `has_role()` semánticamente "ensucia" otros roles | `has_role('DIRECCION')` será `true` para un usuario `DEV`. Aceptado: es el efecto buscado (ver todo), y el short-circuit está comentado. |

## 9. Rollback

- `git revert` del cambio de tipos/roles/permissions + tests.
- En Supabase: borrar el rol `DEV` y restablecer `has_role()` sin short-circuit.
