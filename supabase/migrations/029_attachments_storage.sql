-- =====================================================
-- Migration 029: Finanzas — bucket privado de adjuntos (E4-10)
-- =====================================================
-- Crea el bucket `attachments` (privado). La subida la hace el servidor con
-- service_role (bypasea RLS); la descarga usa URLs firmadas temporales.
-- Sin policies de storage: el bucket privado + service_role + signed URLs alcanza.
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;
