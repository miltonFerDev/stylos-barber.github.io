-- =====================================================
-- Migration 037: Finanzas — Santander DENNYS deja de ser operativa
-- =====================================================
-- Santander DENNYS no recibe ingresos de la barbería: no debe figurar
-- en la "Disponibilidad" del Tablero. Se la marca no disponible y se
-- borra su saldo de apertura de prueba.
-- Nota: no se puede poner el monto en 0 porque account_movements tiene
-- un CHECK (amount > 0); por eso se elimina el movimiento en vez de
-- dejarlo en cero. Idempotente: UUID fijo + condición por clave.
-- =====================================================

UPDATE public.accounts
SET is_available = false
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';

DELETE FROM public.account_movements
WHERE idempotency_key = 'seed-apertura-santander-dennys';
