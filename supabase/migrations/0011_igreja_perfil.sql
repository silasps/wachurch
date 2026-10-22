-- ============================================================
-- MIGRATION 0011 — Perfil público da igreja (estilo Instagram)
-- ============================================================
-- Campos padrão que toda igreja preenche para a sua página pública.
-- Exibidos por components/public-site/igreja-perfil.tsx quando organizations.tipo = 'igreja'.

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS bio          text,                         -- frase curta abaixo do nome
  ADD COLUMN IF NOT EXISTS capa_url     text,                         -- imagem de capa (topo do perfil)
  ADD COLUMN IF NOT EXISTS historia     text,                         -- história da igreja
  ADD COLUMN IF NOT EXISTS ano_fundacao smallint,
  ADD COLUMN IF NOT EXISTS denominacao  text,                         -- ex.: Batista, Presbiteriana
  ADD COLUMN IF NOT EXISTS endereco     jsonb NOT NULL DEFAULT '{}',  -- {cep, logradouro, numero, complemento, bairro, cidade, uf}
  ADD COLUMN IF NOT EXISTS horarios     jsonb NOT NULL DEFAULT '[]',  -- [{dia, hora, nome}]
  ADD COLUMN IF NOT EXISTS lideranca    jsonb NOT NULL DEFAULT '[]';  -- [{nome, cargo, foto_url}]
