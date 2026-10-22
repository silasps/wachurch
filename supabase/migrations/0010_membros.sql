-- ============================================================
-- MIGRATION 0010 — Módulo Igreja: cadastro de membros
-- ============================================================
-- Tabelas:
--   membros           → cadastro de membros e candidatos a membro
--   consentimentos    → prova de consentimento LGPD (versão, hash, IP, UA)
--   membresia_config  → configuração do formulário público por igreja
-- Storage:
--   membros-arquivos  → bucket PRIVADO (foto e carta de transferência)
--
-- LGPD: filiação a organização religiosa é dado pessoal sensível
-- (art. 5º, II e art. 11). Por isso:
--   • não há nenhuma policy anônima — o formulário público grava pelo
--     servidor (service_role) depois de resolver a org pelo host;
--   • só admin/funcionario da própria org (com o módulo 'igreja') leem;
--   • arquivos ficam em bucket privado e são exibidos por URL assinada.

-- ------------------------------------------------------------
-- membros
-- ------------------------------------------------------------
CREATE TABLE public.membros (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Identificação
  nome                      text NOT NULL,
  cpf                       text,           -- só dígitos
  data_nascimento           date,
  sexo                      text CHECK (sexo IN ('feminino','masculino')),
  estado_civil              text CHECK (estado_civil IN ('solteiro','casado','uniao_estavel','divorciado','viuvo')),
  foto_path                 text,           -- caminho no bucket membros-arquivos

  -- Contato
  celular                   text,
  celular_whatsapp          boolean NOT NULL DEFAULT true,
  email                     text,
  endereco                  jsonb NOT NULL DEFAULT '{}',

  -- Situação
  tipo_cadastro             text NOT NULL DEFAULT 'ja_membro'
                              CHECK (tipo_cadastro IN ('ja_membro','quer_ser_membro')),
  situacao                  text NOT NULL DEFAULT 'pendente'
                              CHECK (situacao IN ('pendente','candidato','ativo','inativo','recusado')),
  motivo_inativacao         text,
  origem                    text NOT NULL DEFAULT 'formulario_publico'
                              CHECK (origem IN ('formulario_publico','secretaria')),

  -- Ingresso
  forma_ingresso            text CHECK (forma_ingresso IN ('aclamacao','transferencia','batismo','nao_sei')),
  igreja_origem             text,
  igreja_origem_cidade      text,
  carta_path                text,
  carta_entrega_presencial  boolean NOT NULL DEFAULT false,
  carta_recebida            boolean NOT NULL DEFAULT false,
  fez_curso_integracao      boolean,        -- null = pergunta não se aplicava

  -- Histórico
  ano_batismo               smallint,       -- informado pelo próprio membro (aproximado)
  data_batismo              date,           -- registrado pela igreja (batismo realizado aqui)
  membro_desde_ano          smallint,
  data_recepcao             date,           -- data em que foi recebido como membro

  -- Menor de idade
  responsavel_nome          text,
  responsavel_celular       text,

  -- Controle
  possivel_duplicado_de     uuid REFERENCES public.membros(id) ON DELETE SET NULL,
  aceita_comunicacoes       boolean NOT NULL DEFAULT false,
  observacoes_internas      text,
  aprovado_por              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aprovado_em               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_membros_org_situacao ON public.membros(org_id, situacao);
CREATE INDEX idx_membros_org_cpf      ON public.membros(org_id, cpf);
CREATE INDEX idx_membros_org_nome     ON public.membros(org_id, nome);

CREATE TRIGGER membros_updated_at
  BEFORE UPDATE ON public.membros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_select" ON public.membros FOR SELECT
  USING (
    (org_id = public.get_my_org_id()
      AND public.get_my_role() IN ('admin','funcionario')
      AND public.org_tem_modulo('igreja'))
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "membros_write" ON public.membros FOR ALL
  USING (
    org_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin','funcionario')
    AND public.org_tem_modulo('igreja')
  )
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin','funcionario')
    AND public.org_tem_modulo('igreja')
  );

-- ------------------------------------------------------------
-- consentimentos (prova LGPD)
-- ------------------------------------------------------------
CREATE TABLE public.consentimentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  membro_id     uuid NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  finalidade    text NOT NULL CHECK (finalidade IN ('cadastro_membro','comunicacoes')),
  versao        text NOT NULL,
  texto_hash    text NOT NULL,   -- sha256 do texto exibido no momento do aceite
  coletado_por  text NOT NULL CHECK (coletado_por IN ('titular','responsavel','secretaria_presencial')),
  ip            text,
  user_agent    text,
  revogado_em   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consentimentos_membro ON public.consentimentos(membro_id);

ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consentimentos_select" ON public.consentimentos FOR SELECT
  USING (
    (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','funcionario'))
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "consentimentos_write" ON public.consentimentos FOR ALL
  USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','funcionario'))
  WITH CHECK (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','funcionario'));

-- ------------------------------------------------------------
-- membresia_config (uma linha por org)
-- ------------------------------------------------------------
CREATE TABLE public.membresia_config (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  formulario_aberto    boolean NOT NULL DEFAULT true,
  curso_nome           text,                 -- ex.: 'Café da CIB' (vazio = sem curso)
  curso_descricao      text,
  curso_caminhos       text[] NOT NULL DEFAULT '{batismo}'
                         CHECK (curso_caminhos <@ ARRAY['aclamacao','transferencia','batismo']::text[]),
  texto_aclamacao      text,                 -- vazio = texto padrão do sistema
  texto_transferencia  text,
  texto_batismo        text,
  contato_privacidade  text,                 -- e-mail/telefone de quem responde pelos dados
  mensagem_sucesso     text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER membresia_config_updated_at
  BEFORE UPDATE ON public.membresia_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.membresia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membresia_config_select" ON public.membresia_config FOR SELECT
  USING (
    (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','funcionario'))
    OR public.get_my_role() = 'superadmin'
  );

CREATE POLICY "membresia_config_write" ON public.membresia_config FOR ALL
  USING (org_id = public.get_my_org_id() AND public.get_my_role() = 'admin')
  WITH CHECK (org_id = public.get_my_org_id() AND public.get_my_role() = 'admin');

-- ------------------------------------------------------------
-- Storage: bucket PRIVADO para foto e carta de transferência
-- Path: {org_id}/{membro_id}/foto-{ts}.webp | carta-{ts}.{ext}
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'membros-arquivos',
  'membros-arquivos',
  false,
  10485760,  -- 10 MB
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "membros_arquivos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'membros-arquivos'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND public.get_my_role() IN ('admin', 'funcionario')
  );

CREATE POLICY "membros_arquivos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'membros-arquivos'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND public.get_my_role() IN ('admin', 'funcionario')
  );

CREATE POLICY "membros_arquivos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'membros-arquivos'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND public.get_my_role() IN ('admin', 'funcionario')
  );
