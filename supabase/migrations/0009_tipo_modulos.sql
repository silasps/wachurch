-- ============================================================
-- MIGRATION 0009 — Tipo de conta e módulos licenciados
-- ============================================================
-- A plataforma passa a ter a igreja como produto principal e o
-- projeto social como módulo. Cada organização tem:
--   tipo    → 'igreja' | 'projeto_social' (como a conta se apresenta)
--   modulos → quais módulos a licença libera ('igreja', 'social')
--
-- Licenças vendidas (catálogo em lib/modulos.ts):
--   Igreja                  → tipo 'igreja',         modulos {igreja}
--   Igreja + Projeto Social → tipo 'igreja',         modulos {igreja,social}
--   Projeto Social          → tipo 'projeto_social', modulos {social}
--
-- Organizações existentes continuam como projeto social.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'projeto_social'
    CHECK (tipo IN ('igreja', 'projeto_social'));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS modulos text[] NOT NULL DEFAULT '{social}'
    CHECK (modulos <@ ARRAY['igreja', 'social']::text[]);

-- Retorna true se a org do usuário autenticado tem o módulo licenciado
CREATE OR REPLACE FUNCTION public.org_tem_modulo(p_modulo text)
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT p_modulo = ANY(o.modulos)
       FROM public.organizations o
      WHERE o.id = public.get_my_org_id()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
