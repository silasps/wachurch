-- ============================================================
-- MIGRATION 0013 — Áreas de acesso por usuário + vínculo membro↔usuário
-- ============================================================
-- profiles.areas: quais áreas (módulos) o usuário acessa dentro da org.
--   NULL = todas as áreas da licença da org (padrão — usuários existentes não mudam).
--   Ex.: secretária só da igreja → {igreja}; professor só do projeto → {social}.
-- membros.profile_id: membro que virou usuário do sistema.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS areas text[]
    CHECK (areas IS NULL OR areas <@ ARRAY['igreja', 'social']::text[]);

ALTER TABLE public.membros
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- true se o usuário autenticado pode acessar a área (NULL em profiles.areas = todas)
CREATE OR REPLACE FUNCTION public.usuario_tem_area(p_area text)
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT p.areas IS NULL OR p_area = ANY(p.areas) FROM public.profiles p WHERE p.id = auth.uid()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Membros: além do módulo na licença, o usuário precisa ter a área igreja
DROP POLICY IF EXISTS "membros_select" ON public.membros;
DROP POLICY IF EXISTS "membros_write" ON public.membros;

CREATE POLICY "membros_select" ON public.membros FOR SELECT
  USING (
    (org_id = public.get_my_org_id()
      AND public.get_my_role() IN ('admin','funcionario')
      AND public.org_tem_modulo('igreja')
      AND public.usuario_tem_area('igreja'))
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "membros_write" ON public.membros FOR ALL
  USING (
    org_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin','funcionario')
    AND public.org_tem_modulo('igreja')
    AND public.usuario_tem_area('igreja')
  )
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin','funcionario')
    AND public.org_tem_modulo('igreja')
    AND public.usuario_tem_area('igreja')
  );
