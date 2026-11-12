-- =====================================================
-- Migration 033: Finanzas — subcategoría en obligaciones
-- =====================================================
-- Conecta la subcategoría (catálogo sembrado en 030) al flujo de
-- obligaciones: agrega subcategory_id (opcional) a obligations.
-- =====================================================

ALTER TABLE public.obligations
ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subcategories(id);
