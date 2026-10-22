-- ============================================================
-- MIGRATION 0012 — Cor personalizada e tema do site
-- ============================================================
-- cor_personalizada: cor exata da marca (hex). Quando preenchida, substitui a paleta (cor_primaria).
-- tema: 'claro' | 'escuro' — aplicado à página pública da igreja (igreja-perfil.tsx).

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS cor_personalizada text
    CHECK (cor_personalizada IS NULL OR cor_personalizada ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS tema text NOT NULL DEFAULT 'claro'
    CHECK (tema IN ('claro', 'escuro'));
