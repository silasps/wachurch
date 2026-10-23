-- ============================================================
-- MIGRATION 0014 — Layout "Editorial" do site da igreja
-- ============================================================
-- Campos de conteúdo usados pelo layout editorial (multi-página: Início, História, Cultos, Membros).
-- O layout fica no código; o conteúdo vem do painel (Site → Perfil da igreja / Aparência).

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS nome_curto          text,  -- ex.: SIBALT (botões "Conheça a …", rodapé)
  ADD COLUMN IF NOT EXISTS boas_vindas         text,  -- linha acima do slogan (padrão: "Aqui há lugar para você")
  ADD COLUMN IF NOT EXISTS slogan              text,  -- frase principal do topo (padrão: bio)
  ADD COLUMN IF NOT EXISTS logo_horizontal_url text;  -- marca por extenso, PNG/WebP sem fundo

-- template_id: + 'perfil' (perfil estilo Instagram) e 'editorial'
ALTER TABLE public.site_config DROP CONSTRAINT IF EXISTS site_config_template_id_check;
ALTER TABLE public.site_config ADD CONSTRAINT site_config_template_id_check
  CHECK (template_id IN ('minimalista','comunitario','institucional','colorido','galeria','perfil','editorial'));
