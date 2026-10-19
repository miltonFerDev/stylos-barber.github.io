# Spec — Sistema financiero sprint 24: login email/password

> Reemplaza el placeholder "Iniciá sesión" por un login real de email/password, tras quitar Google OAuth y el auto-registro (decisión de producto: el dueño da de alta cada usuario a mano).

## 1. Problema

`/finanzas` hoy no tiene forma de autenticarse: mostraba un texto "Iniciá sesión" asumiendo la sesión de Google vía `/prode`. Sin Google ni auto-registro, falta un login email/password.

## 2. Objetivo

- Pantalla `Login` con email + contraseña (`signInWithPassword` del cliente Supabase).
- `FinanzasShell` se vuelve un gate de sesión: sin sesión → login; con sesión → nav + pantallas.
- Botón "Salir" (`signOut`).

## 3. Alcance incluido / excluido

**Incluido:** login, gate de sesión, logout. Sin registro (no existe; los usuarios los crea el dueño en el Dashboard).

**Excluido:** recuperación de contraseña, registro, Google, manejo de "usuario sin rol" (muestra el error del endpoint como hoy).

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/ui/Login.tsx` | Crear formulario. |
| `src/finanzas/ui/FinanzasShell.tsx` | Gate de sesión (`getSession` + `onAuthStateChange`) + botón Salir. |

## 5. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- Sin sesión se ve el login; con credenciales válidas entra al tablero; "Salir" vuelve al login.
- No se tocan landing, `/prode`, `/escuela`, ni el backend de auth.
- No se agrega registro ni proveedores OAuth.

## 6. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Usuario logueado sin rol | Entra pero ve error 403 del endpoint (comportamiento actual); se mejora con un mensaje dedicado después. |
| `onAuthStateChange` en desmontaje | Se hace `unsubscribe()` en el cleanup. |
