# Ostrick Social — Arquitetura do Sistema

> **Propósito deste arquivo:** documentar a arquitetura completa do sistema de forma suficiente para que qualquer IA (ou desenvolvedor) consiga recriar o projeto do zero em outro local, apenas lendo este documento. Ele é vivo — **deve ser atualizado sempre que a arquitetura crescer ou mudar** (nova tabela, novo módulo, nova convenção, novo padrão de UI). Não é um changelog: descreve o estado atual, não o histórico.
>
> Última atualização: 2026-10-20.

---

## 1. Visão geral do produto

Ostrick Social é uma **plataforma SaaS multi-tenant de gestão para igrejas e projetos sociais**. A **igreja é o produto principal**; o **projeto social é um módulo** que pode ser vendido junto com a igreja (pacote) ou sozinho. Cada organização ("org") tem seu próprio subdomínio (ou domínio customizado), seus próprios usuários, dados e site público — tudo isolado por `org_id` com Row Level Security no banco.

### Tipo de conta e módulos (licenças)
- `organizations.tipo` — `'igreja' | 'projeto_social'` (como a conta se apresenta).
- `organizations.modulos` — `text[]` com os módulos liberados pela licença: `'igreja'` (membros) e `'social'` (alunos, turmas, voluntariado, painel do professor).
- Comum a todas as contas (sem módulo): dashboard, usuários, financeiro, site, configurações.
- Catálogo de licenças em `lib/modulos.ts` (`LICENCAS`): **Igreja** (`igreja`/`{igreja}`), **Igreja + Projeto Social** (`igreja`/`{igreja,social}`), **Projeto Social** (`projeto_social`/`{social}`). O superadmin escolhe a licença ao criar/editar a org.
- `organizations.plano` é só a faixa de cobrança (`PLANOS` em `lib/modulos.ts`) — **não libera nada**; quem libera é `modulos`.

Perfis de uso (roles):
- **superadmin** — dono da plataforma, gerencia todas as organizações, pode "impersonar" (visualizar como) qualquer org/role.
- **admin** — administrador de uma organização (acesso total dentro da sua org).
- **funcionario** — operacional (alunos, turmas, financeiro — sem gestão de usuários/site/configurações).
- **professor** — dá aula em turmas, lança chamada, materiais, atividades, vê seus próprios honorários no financeiro.
- **aluno** / **responsavel** — roles previstas no schema para portal do aluno/responsável (ainda não têm painel implementado — ver seção 12 "Próximos incrementos").

---

## 2. Stack tecnológico

- **Framework:** Next.js 15 (App Router, Turbopack em dev) — `"next": "^15.5.19"`
- **React 19** (`react`, `react-dom": "^19.0.0"`)
- **TypeScript 5**, `strict: true`
- **Banco de dados / Auth / Storage:** Supabase (Postgres + Supabase Auth + Supabase Storage), via `@supabase/ssr` (SSR cookies) e `@supabase/supabase-js`
- **Estilo:** Tailwind CSS v4 (`@import "tailwindcss"` em `app/globals.css`, tema custom via `@theme inline`), sem nenhuma lib de componentes (**não há shadcn/ui, Radix ou Headless UI** — todo componente de UI, incluindo modais, é feito à mão com Tailwind puro)
- **Ícones:** `lucide-react`
- **Utilitários:** `clsx` + `tailwind-merge` (helper `cn()` em `lib/utils.ts`)
- **Outros:** `nextjs-toploader` (barra de progresso no topo em navegação), `react-easy-crop` (crop de imagens, usado em upload de logo/imagens do site e na foto do membro), `qrcode` (QR code do link do formulário de cadastro de membros)
- **Lint:** ESLint 9 (`next/core-web-vitals`, `next/typescript`)
- **Deploy:** Vercel (evidenciado por `VERCEL_OIDC_TOKEN` em env) + Supabase (projeto cloud)

Não há suíte de testes automatizados configurada no projeto até o momento.

---

## 3. Multi-tenancy

Cada organização é uma linha em `organizations`. A resolução de tenant acontece no **middleware** (`middleware.ts`) a partir do host da requisição, via `lib/tenant.ts`:

- `slug.ostricksocial.com.br` → tenant pelo slug (produção)
- `slug.localhost` → tenant pelo slug (dev)
- domínio customizado verificado (tabela `custom_domains`) → tenant pelo domínio
- `ostricksocial.com.br` / `www.ostricksocial.com.br` / `localhost` (sem subdomínio) → **domínio raiz da plataforma** (sem tenant — login, superadmin, marketing)

O middleware injeta o slug resolvido como header `x-tenant-slug` para os Server Components lerem. A resolução usa o cliente anon do Supabase (sem cookies) porque roda antes da sessão.

O middleware **também** faz refresh de sessão (Supabase SSR) e protege rotas: qualquer path começando com `/admin`, `/professor`, `/aluno`, `/responsavel`, `/superadmin` exige usuário autenticado, senão redireciona para `/entrar?redirect=...`.

Todas as tabelas de domínio (exceto `organizations`, `custom_domains` e a ponte `profiles`) têm coluna `org_id` e RLS filtrando por ela (ver seção 6).

---

## 4. Autenticação e Autorização

- **Auth:** Supabase Auth (email + senha). Sessão via cookies SSR (`@supabase/ssr`).
- **Perfil (`profiles`):** ponte 1:1 entre `auth.users` e a organização. Criado automaticamente por trigger `handle_new_user` quando o `auth.users` é criado com `org_id`/`role`/`nome` em `raw_user_meta_data` — ou manualmente via `service_role` (rotas admin de criação de usuário usam `createServiceClient()` + `auth.admin.createUser()` seguido de `upsert` em `profiles`).
- **`lib/auth.ts`:**
  - `getSession()` — retorna `{ profile, userId }` ou `null`.
  - `requireAuth()` — redireciona para `/entrar` se não logado.
  - `requireRole(allowedRoles: UserRole[])` — redireciona para `/acesso-negado` se a role não estiver na lista. **Todo Server Component de página protegida chama isso na primeira linha.**
  - `getLoginDestination(role)` — mapeia role → painel inicial (`/superadmin`, `/admin`, `/professor`, `/aluno`, `/responsavel`).
- **`lib/rbac.ts`:** funções `canX(role): boolean` baseadas em `ROLE_LEVEL` (hierarquia numérica: superadmin 100 > admin 80 > funcionario 50 > professor 30 > aluno/responsavel 10). Cada permissão de módulo é uma função exportada (`canVerFinanceiro`, `canGerenciarUsuarios`, etc.) — **ao adicionar um módulo novo, adicionar a permissão aqui**, nunca checar `role === 'admin'` espalhado pelo código.
- **Módulos (licença) — `lib/modulos.ts` + `lib/org.ts`:** além da role, cada área de módulo checa se a licença da org tem o módulo.
  - `getCurrentOrg(profile)` — org **efetiva** (a do perfil, ou a impersonada pelo superadmin via `sa_imp_org_id`), com React `cache()`.
  - `requireModulo(profile, modulo)` — para páginas: redireciona para `/admin` se o módulo não estiver na licença. As áreas do módulo social (`alunos/`, `turmas/`, `voluntariado/`) têm um `layout.tsx` que chama isso; o layout `(professor)` redireciona para `/acesso-negado`.
  - `temModulo(profile, modulo)` — para rotas de API do módulo social (403 se ausente). Rotas do módulo igreja usam `autorizarMembros(permissao)` de `lib/membros-server.ts` (sessão + permissão + módulo, devolve `{ profile, org }`).
  - `orgTemModulo(org, modulo)` / `modulosDaOrg(org)` — org sem a coluna `modulos` (migration 0009 não aplicada) é tratada como `['social']`.
  - O menu (`admin-sidebar.tsx`) filtra cada item por role **e** módulo (`NAV_ITEMS[].modulo`); com os dois módulos, o desktop agrupa em "Igreja" / "Projeto Social" / "Geral".
  - Permissões do módulo igreja em `lib/rbac.ts`: `canVerMembros`, `canGerenciarMembros` (funcionario+ — a secretaria usa o role `funcionario`), `canConfigurarMembresia` (admin+).
- **RLS no Postgres é a autorização real** — os checks em `lib/rbac.ts`/`requireRole` são para UX (esconder/bloquear na aplicação); o banco também aplica as mesmas regras via `get_my_org_id()` / `get_my_role()` (funções `SECURITY DEFINER`) nas policies.
- **Impersonação (superadmin):** `app/api/superadmin/impersonate/route.ts` seta cookies httpOnly (`sa_imp_org_id`, `sa_imp_role`) para o superadmin "ver como" uma org/role específica, sem trocar de usuário de verdade. Banner de aviso em `components/superadmin/impersonation-banner.tsx`.
- **Preview de role (admin):** admin pode simular temporariamente a visão de `funcionario` dentro do próprio painel (`lib/actions/admin-preview-role.ts` + `components/admin/role-preview-*`), útil para QA de permissões sem criar outro usuário.

---

## 5. Modelo de dados

Fonte de verdade: `supabase/migrations/*.sql`, aplicadas **em ordem numérica**. Os tipos TypeScript espelhados ficam em `types/index.ts` (`UserRole`, `Organization`, `Profile`, `Aluno`, `Turma`, etc. — mantenha os dois sincronizados manualmente a cada migration nova).

### Migrations existentes (ordem de aplicação)
1. `0000_drop_all.sql` — reset completo (dev only)
2. `0001_initial_schema.sql` — schema base completo: organizations, custom_domains, profiles, alunos, responsaveis, responsavel_aluno, turmas, matriculas, encontros, presencas, materiais, atividades, entregas, avaliacoes, comunicados, funcoes_voluntariado, necessidades_voluntariado, candidaturas_voluntariado, participantes_voluntariado, site_config, site_posts, site_galeria, solicitacoes_admissao — com índices, RLS completo e triggers (`handle_new_user`, `set_updated_at`)
3. `0002_superadmin_fix.sql` — `profiles.org_id` vira nullable (superadmin não pertence a org); policy de superadmin em `organizations`
4. `0003_alunos_ficha.sql` — colunas extras em `alunos` (email, sexo, documento, autorização de imagem, `dados_complementares` jsonb) + tabela `termos_ficha` (assinatura digital de termos legais — token, OTP, evidência jurídica conforme Lei 14.063/2020)
5. `0004_org_contact_fields.sql` — `organizations.email_contato`, `organizations.telefone`
6. `0005_storage_site_assets.sql` — bucket Supabase Storage `site-assets` (público, 5MB, imagens) com policies de upload por `org_id` (pasta = `org_id`)
7. `0006_financeiro.sql` — tabela `financeiro_lancamentos` (ver `project_financeiro` na memória do projeto para detalhes de produto)
8. `0007_public_read_policies.sql` — policies de leitura anônima (site público): `organizations` ativas, `site_config` publicados, `custom_domains` verificados
9. `0008_melhorias.sql` — tabela `sugestoes_melhoria` (feedback in-app via FAB, `components/melhoria-fab.tsx`)
10. `0009_tipo_modulos.sql` — `organizations.tipo` (`igreja`|`projeto_social`, default `projeto_social`) e `organizations.modulos` (`text[]`, default `{social}`) + função `public.org_tem_modulo(text)` (`SECURITY DEFINER`) para policies de módulo
11. `0010_membros.sql` — módulo Igreja: tabelas `membros`, `consentimentos`, `membresia_config` + bucket **privado** `membros-arquivos` (ver abaixo)
12. `0011_igreja_perfil.sql` — campos do perfil público da igreja em `site_config`: `bio`, `capa_url`, `historia`, `ano_fundacao`, `denominacao`, `endereco` jsonb, `horarios` jsonb `[{dia,hora,nome}]`, `lideranca` jsonb `[{nome,cargo,foto_url}]`. Editados em `/admin/site/igreja`; exibidos por `components/public-site/igreja-perfil.tsx` (perfil estilo Instagram: capa, logo, bio, botões, abas por âncora Início/História/Projeto social/Contato), que `app/(public)/page.tsx` e o preview usam quando `organizations.tipo = 'igreja'` (demais contas seguem com `site-renderer.tsx`).

13. `0012_site_cor_tema.sql` — `site_config.cor_personalizada` (hex exato da marca; substitui a paleta `cor_primaria`) e `site_config.tema` (`claro`|`escuro`, usado pelo perfil da igreja). Cores sempre via `coresDoSite()` de `lib/cores.ts` (`marca`, `primary` = ajustada para contraste AA com texto branco, `secondary`); nunca ler `COLOR_PALETTE[...]` direto. Tema escuro = classe `.tema-escuro` + variante Tailwind `escuro:` (declarada em `app/globals.css`).

**Aplicação das migrations:** `DATABASE_URL` no `.env.local` (Session pooler `aws-0-us-west-2.pooler.supabase.com:5432` — o host `db.<ref>.supabase.co` é só IPv6) e `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/NNNN_x.sql`. **Nunca `supabase db push`**: o histórico de migrations do Supabase está vazio (tudo foi aplicado à mão) e ele rodaria `0000_drop_all.sql`. Estado em 2026-10-21: 0001–0012 aplicadas (a policy `org_write_superadmin` da 0002 não existe — sintaxe `CREATE POLICY IF NOT EXISTS` inválida; não faz falta pois o superadmin grava via service client).

### Módulo Igreja — cadastro de membros (`0010`)
- **`membros`**: identificação (`nome`, `cpf` só dígitos, `data_nascimento`, `sexo`, `estado_civil`, `foto_path`), contato (`celular`, `celular_whatsapp`, `email`, `endereco` jsonb), `tipo_cadastro` (`ja_membro`|`quer_ser_membro`), `situacao` (`pendente` = disse já ser membro e aguarda conferência · `candidato` = quer ser membro · `ativo` · `inativo` · `recusado`), ingresso (`forma_ingresso` `aclamacao`|`transferencia`|`batismo`|`nao_sei`, `igreja_origem`, `carta_path`, `carta_entrega_presencial`, `carta_recebida`, `fez_curso_integracao`), histórico (`ano_batismo` informado, `data_batismo` registrada pela igreja, `membro_desde_ano`, `data_recepcao`), responsável (menor de 18), `possivel_duplicado_de` (mesmo CPF), `aceita_comunicacoes`, `observacoes_internas`, `aprovado_por/em`. **CPF não é UNIQUE de propósito**: o formulário público não pode revelar se alguém já é membro — envios com CPF repetido entram marcados como possível duplicado e a secretaria mescla.
- **`consentimentos`**: prova LGPD por finalidade (`cadastro_membro`|`comunicacoes`) com `versao`, `texto_hash` (sha256 do texto exibido), `coletado_por` (`titular`|`responsavel`|`secretaria_presencial`), `ip`, `user_agent`, `revogado_em`. O texto vive em `lib/termos/content-membro.ts` — **ao mudar o texto, incrementar `CONSENTIMENTO_MEMBRO_VERSAO`**.
- **`membresia_config`** (1 por org): `formulario_aberto`, curso de integração (`curso_nome` ex. "Café da CIB", `curso_descricao`, `curso_caminhos` em quais caminhos a pergunta aparece — padrão `{batismo}`), textos de cada caminho (vazio = padrão de `lib/membros.ts`), `contato_privacidade`, `mensagem_sucesso`. Sem linha = padrões (`MEMBRESIA_CONFIG_PADRAO`).
- **RLS**: só `admin`/`funcionario` da org com `org_tem_modulo('igreja')` (+ SELECT do superadmin). **Nenhuma policy anônima** — filiação religiosa é dado sensível (LGPD art. 5º II / art. 11).

### Padrão de tabela de domínio
Toda tabela nova de domínio deve seguir o padrão já estabelecido:
```sql
CREATE TABLE public.<tabela> (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ...colunas...
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<tabela>_select" ON public.<tabela> FOR SELECT
  USING (org_id = public.get_my_org_id() OR public.get_my_role() = 'superadmin');
CREATE POLICY "<tabela>_write" ON public.<tabela> FOR ALL
  USING (org_id = public.get_my_org_id() AND public.get_my_role() IN (<roles permitidas>));
```
Depois: criar migration `NNNN_descricao.sql` (número sequencial, 4 dígitos), adicionar a interface em `types/index.ts`, adicionar permissão em `lib/rbac.ts` se necessário.

---

## 6. Row Level Security — padrão

Duas funções auxiliares `SECURITY DEFINER` usadas em **todas** as policies:
- `public.get_my_org_id()` → `org_id` do usuário autenticado (via `profiles`)
- `public.get_my_role()` → `role` do usuário autenticado

Convenção: `superadmin` sempre tem bypass explícito (`OR public.get_my_role() = 'superadmin'`) nas policies de SELECT. Tabelas legadas com escrita pública anônima (candidatura a voluntário, solicitação de admissão) têm policy de INSERT com `WITH CHECK (true)` — dados sensíveis dessas tabelas nunca devem ser expostos em SELECT anônimo.

**Padrão para formulários públicos novos (obrigatório):** a rota `app/api/public/**` resolve a org **pelo host** (`resolveOrgFromHost(request.headers.get('host'))`) — **nunca** aceita `org_id` vindo do navegador —, valida tudo no servidor e grava com `createServiceClient()`. Assim a tabela não precisa de policy anônima. Referência: `app/api/public/membros/route.ts` (também com honeypot `website` e resposta idêntica para CPF repetido). `app/api/public/solicitacoes` já segue a resolução por host.

Funções de módulo: `public.org_tem_modulo(p_modulo)` → true se a org do usuário tem o módulo na licença (usar nas policies das tabelas de módulo).

---

## 7. Storage (Supabase Storage)

- **Bucket `site-assets`** (público): logo, imagens de hero/sobre/galeria/posts do site institucional de cada org. Convenção de path: `{org_id}/...`. Upload/delete restrito a `admin`/`superadmin` da própria org via RLS de `storage.objects`.

- **Bucket `membros-arquivos`** (**privado**, 10MB, jpeg/png/webp/pdf): foto e carta de transferência dos membros. Path `{org_id}/{membro_id}/{foto|carta}-{ts}.{ext}`. Leitura/escrita só da equipe (`admin`/`funcionario`) da pasta da org; na prática o servidor usa service client e o painel exibe por **URL assinada** de 1h (`assinarUrls()` em `lib/membros-server.ts`). Nunca usar `getPublicUrl` nesse bucket.

Ao criar um bucket novo, seguir o mesmo padrão: público para leitura **só** se for asset de site público; dados pessoais vão em bucket privado com URL assinada. Path prefixado por `org_id`, policies de INSERT/DELETE restritas por role + pasta.

**Regra: toda imagem enviada é gravada em WebP.** A conversão é feita no servidor com `sharp` (`lib/imagem-server.ts` → `paraWebp()`), que também corrige a rotação EXIF e remove metadados (inclusive GPS). Aplicada em `enviarArquivo()` (membros), `/api/admin/site/imagem` e `/api/admin/site/logo`; PDF e SVG seguem como estão. Novo ponto de upload de imagem deve usar `paraWebp()`. No navegador, `lib/imagem.ts` tenta gerar WebP (fallback JPEG) e converte HEIC do iPhone com `heic2any` (import dinâmico, só quando aparece HEIC).

**Uploads e limite da Vercel:** a Vercel aceita no máximo **4,5 MB por requisição**. Imagens são recortadas/reduzidas no navegador antes do envio (`lib/imagem.ts`; `components/ui/photo-picker.tsx` ~800px JPEG; `components/ui/document-picker.tsx` ~2000px JPEG, PDF até 3,5MB). Limites centralizados em `lib/membros.ts` (`FOTO_MAX_BYTES`, `CARTA_MAX_BYTES`).

---

## 8. Estrutura de pastas (Next.js App Router)

```
app/
  layout.tsx                    — layout raiz (NextTopLoader, fonte, globals.css)
  globals.css                   — Tailwind v4 + tema (--color-primary etc.)
  page.tsx                      — (não existe na raiz; landing fica em (public))
  (public)/                     — route group: site institucional multi-tenant + marketing
    page.tsx                    — landing (renderiza conforme tenant resolvido)
    faca-parte/                 — formulário público de candidatura
    cadastro/                   — cadastro público de membros (módulo igreja) — wizard passo a passo
    privacidade/                — aviso de privacidade LGPD da igreja
    _components/                — landing-page.tsx (marketing), tenant-header.tsx (cabeçalho das páginas do tenant)
    termos/[token]/             — assinatura digital de termo (aluno)
    voluntario/termos/[token]/  — assinatura digital de termo (voluntário)
  (auth)/entrar/                — login (Server Action em actions.ts)
  (admin)/admin/                — painel admin/funcionário (layout com sidebar)
    membros/                    — módulo igreja (lista por abas, detalhe/ações, form da secretaria, config do formulário + QR)
    usuarios/, financeiro/, site/, configuracoes/   — comuns a todas as licenças
    alunos/, turmas/, voluntariado/                 — módulo social (cada pasta tem layout.tsx com requireModulo('social'))
  (professor)/professor/        — painel do professor (layout próprio)
    turmas/[id]/{chamada,materiais,atividades}/, financeiro/, comunicados/
  superadmin/                   — painel da plataforma (sem route group — prefixo direto)
    organizacoes/, usuarios/, melhorias/, configuracoes/
  s/[slug]/                     — visualização alternativa do site público por slug (preview?)
  acesso-negado/                — página de erro 403
  api/
    admin/...                   — rotas de mutação usadas pelos painéis admin (usuarios, alunos, turmas, financeiro, site, solicitacoes, membros, membresia-config)
    admin/membros/              — POST (multipart, secretaria) · [id] GET consentimentos / PATCH acao=editar|checklist|confirmar|receber|recusar|inativar|reativar|reabrir|revogar_comunicacoes / DELETE (apaga arquivos) · [id]/arquivos · [id]/mesclar
    professor/...                — ex: turmas/[id]/chamada
    superadmin/...               — organizacoes, impersonate, melhorias
    auth/signout/
    public/solicitacoes/         — endpoint público (anon) de candidatura (org resolvida pelo host)
    public/membros/              — cadastro público de membros (multipart, org pelo host, service client)
    melhorias/                   — feedback in-app (FAB)

components/
  ui/                            — componentes de UI genéricos e reutilizáveis (Modal, Skeleton*, PhotoPicker, DocumentPicker)
  admin/                         — componentes específicos do painel admin (role preview)
  superadmin/                    — específicos do superadmin (impersonation banner)
  public-site/                   — renderer do site institucional (site-renderer.tsx)
  melhoria-fab.tsx               — FAB de feedback global (fica em components/, não em ui/)

lib/
  auth.ts, auth-client.ts        — sessão, requireRole, destino de login
  rbac.ts                        — permissões por role, labels, hierarquia
  tenant.ts                      — resolução de tenant por host
  supabase.ts                    — cliente browser (createBrowserClient)
  supabase-server.ts             — cliente server (SSR cookies) + createServiceClient (service_role, bypassa RLS)
  utils.ts                       — cn(), formatDate (datas 'AAAA-MM-DD' formatadas sem passar por Date/UTC), formatDateTime, getInitials
  modulos.ts                     — LICENCAS, PLANOS, MODULO_LABELS, orgTemModulo, modulosDaOrg, nomeDoTipo
  org.ts                         — getCurrentOrg, requireModulo, temModulo, getApiContext (org efetiva, respeita impersonação)
  mascaras.ts                    — máscaras/validações BR: CPF (dígitos verificadores), telefone, CEP, data DD/MM/AAAA, idade, cpfOculto
  cep.ts                         — buscarCep (ViaCEP)
  imagem.ts                      — recorte/redução de imagem no navegador (canvas)
  membros.ts                     — constantes/labels/textos padrão do módulo igreja (sem dependência de servidor)
  membros-validacao.ts           — validarDadosMembro (estrito no público, flexível na secretaria)
  membros-server.ts              — service-side: autorizarMembros, getMembresiaConfig, assinarUrls, enviarArquivo, encontrarDuplicado, registrarConsentimentos
  actions/                       — Server Actions (ex: admin-preview-role.ts)
  termos/                        — conteúdo estático dos termos legais (content-aluno.ts, content-voluntario.ts, content-membro.ts — LGPD do cadastro de membros, versionado)

types/index.ts                   — todos os tipos TS do domínio (espelha o schema SQL)

supabase/migrations/             — schema versionado, fonte de verdade do banco

middleware.ts                    — tenant + auth guard
next.config.ts                   — remotePatterns de imagem (domínio do Storage do Supabase)
```

### Convenção de rotas por role
- `/admin/*` → admin, funcionario, superadmin (via `requireRole`)
- `/professor/*` → professor
- `/superadmin/*` → superadmin
- `/aluno/*`, `/responsavel/*` → previstos no middleware mas **ainda sem páginas implementadas**
- `(public)` → sem autenticação, resolve tenant pelo host

---

## 9. Convenções de código e padrões de UI

### 9.1 Padrão obrigatório: criar/editar sempre abre modal (não página nem form inline)
Ver memória de projeto `[[feedback_modal_pattern]]` (arquivo local do Claude, não versionado no repo) para o histórico da decisão. Resumo da receita — **aplicar sempre que criar um módulo novo com ação de "Novo X" / "Editar X"**:

- Componente reutilizável: `components/ui/modal.tsx` — `<Modal open onClose title description? maxWidth?>`. Mobile-first: bottom-sheet no mobile (`items-end`), dialog centralizado em `sm:`+ (`sm:items-center`). `createPortal` para `document.body`, fecha com ESC/clique fora. **Não recriar — importar.**
- `page.tsx` continua **Server Component**: busca dados (Supabase, respeitando `searchParams`/filtros) e repassa via props para um Client Component de listagem.
- Client Component de listagem (`*-list.tsx`, `'use client'`): guarda `useState` do modal (`open`, e `editando` quando o módulo edita), botão "Novo X" faz `setOpen(true)` (nunca `<Link href=".../novo">`), renderiza a listagem (cards mobile + tabela desktop) e o `<Modal>` no fim envolvendo o form. `handleSuccess = () => { setOpen(false); router.refresh() }`.
- Form vira Client Component separado com props `onSuccess`/`onCancel` (nunca `router.push`/`router.back()`/link "Cancelar"). Fica sem o wrapper de card (`bg-white rounded-xl border...`) porque já vive dentro do `<Modal>`.
- Quando a listagem já tem os dados completos de cada item, o modal de edição reaproveita o objeto da própria linha como prop `inicial` — **sem fetch adicional**, sem rota `[id]/editar`.
- Não existem mais rotas de página dedicada `.../novo`, `.../nova` ou `.../[id]/editar` no projeto — foram todas eliminadas em favor desse padrão (usuários, alunos, turmas, financeiro/lançamentos, organizações).

### 9.1.1 Formulários públicos (para quem tem mais idade e para quem é mais tecnológico)
Referência: `app/(public)/cadastro/cadastro-membro-wizard.tsx`.
- Passo a passo com barra "Passo X de N", uma pergunta/tema por tela, tela de revisão com "Alterar" e tela final dizendo o que acontece depois.
- Fonte ≥16px nos campos (`text-lg`, evita zoom do iOS), campos altos (`py-3.5`), botões grandes (`py-4 text-lg`), rótulo sempre visível acima do campo (nunca só placeholder), linguagem simples e ajuda curta abaixo do rótulo.
- Datas digitadas como DD/MM/AAAA com máscara e teclado numérico (não usar `<input type="date">` no público). CPF/telefone/CEP com máscara (`lib/mascaras.ts`) e `inputMode` adequado; CEP preenche o endereço.
- Escolhas como cartões/botões grandes, não `<select>`. Foto com "Tirar foto" e "Galeria".
- Cor da org via CSS var `--cor` (`focus:border-[var(--cor)]`).
- Rascunho em `sessionStorage` (com try/catch, expira em 2h, sem consentimento/arquivos) — não usar `localStorage` porque o formulário pode estar num tablet compartilhado na igreja.
- Consentimento LGPD: checkbox desmarcado, destacado, com resumo + "Ler o texto completo"; finalidades distintas em checkboxes separados.

### 9.2 Mobile-first
Todo layout deve funcionar primeiro em mobile e se adaptar em telas maiores via `sm:`/`lg:` do Tailwind. Padrão recorrente: cards empilhados no mobile (`sm:hidden`) + tabela no desktop (`hidden sm:block`) para listagens.

### 9.3 Server vs Client Components
- Busca de dados (Supabase) sempre em Server Component quando possível.
- `'use client'` só nos componentes que precisam de estado/interação (forms, modais, dropdowns).
- Mutações via `fetch()` para rotas em `app/api/**/route.ts` a partir de Client Components, seguido de `router.refresh()` — **não** Server Actions para CRUD dos painéis (só usado pontualmente, ex: login, preview de role).

### 9.4 Estilo visual
- Paleta neutra: `gray-*` para texto/bordas, `blue-600`/`blue-700` como cor de ação primária no admin, cores semânticas por status (`green-*` positivo/ativo, `red-*` negativo/erro, `yellow-*` pendente).
- Cards: `bg-white rounded-xl border border-gray-200`.
- Inputs: `w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`.
- `superadmin/*` usa tema escuro (`bg-white/5`, `border-white/10`, texto claro) — diferente do admin/professor (tema claro). O `Modal` continua sempre claro (`bg-white`) mesmo sobre fundo escuro, por design.
- Ícones: sempre `lucide-react`.

### 9.5 Nomenclatura
- Português para nomes de domínio (tabelas, campos, rotas, variáveis de negócio: `aluno`, `turma`, `lancamento`, `descricao`) — inglês só para termos técnicos genéricos.
- Arquivos de listagem: `*-list.tsx`. Arquivos de form: `*-form.tsx` (ou `<entidade>-form.tsx`).
- `loading.tsx` do Next.js existe em quase toda rota de página — manter ao mexer na pasta.

---

## 10. Variáveis de ambiente

Arquivo `.env.local` (nunca commitado — está no `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=              # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # chave anon (pública, respeita RLS)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=  # chave publishable (novo formato Supabase)
DATABASE_URL=                          # SÓ local: Postgres via Session pooler (aws-0-us-west-2…:5432) para aplicar migrations com psql — não vai para a Vercel
SUPABASE_SERVICE_ROLE_KEY=             # chave service_role (bypassa RLS — só em rotas server-side administrativas: criação de usuário via Auth Admin API, etc.)
VERCEL_OIDC_TOKEN=                     # gerado automaticamente pela Vercel em deploys
```

`next.config.ts` também referencia o hostname do Storage do Supabase em `images.remotePatterns` — atualizar ao trocar de projeto Supabase.

---

## 11. Deploy

- **App:** Vercel (Next.js nativo).
- **Banco/Auth/Storage:** Supabase (projeto cloud). Migrations em `supabase/migrations/` devem ser aplicadas manualmente (SQL Editor do Supabase ou CLI) **em ordem numérica** — não há pipeline de migration automatizado configurado ainda.
- **Domínios:** domínio raiz da plataforma configurado na Vercel; subdomínios de tenant (`*.ostricksocial.com.br`) via wildcard DNS + Vercel; domínios customizados de cliente via tabela `custom_domains` (fluxo de verificação ainda a definir/conferir em `app/(admin)/admin/site/dominio/`).

---

## 12. Como recriar este projeto do zero (passo a passo para outra IA)

1. `npx create-next-app@latest` com TypeScript, App Router, Tailwind — depois ajustar `package.json` para as versões exatas da seção 2 (`npm install` das dependências listadas).
2. Configurar Tailwind v4 (`@import "tailwindcss"` em `globals.css`, ver seção 9.4 para tema).
3. Criar projeto no Supabase. Copiar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para `.env.local`; gerar/copiar `SUPABASE_SERVICE_ROLE_KEY`.
4. Rodar as migrations de `supabase/migrations/` **em ordem numérica** no SQL Editor do Supabase (pular `0000_drop_all.sql` em banco novo).
5. Criar o primeiro usuário `superadmin` manualmente (via painel Auth do Supabase + INSERT em `profiles` com `role='superadmin'`, `org_id=NULL` — instruções comentadas em `0002_superadmin_fix.sql`).
6. Recriar `lib/` (auth, rbac, tenant, supabase clients, utils) conforme seção 4, 6, 9.
7. Recriar `middleware.ts` conforme seção 3.
8. Recriar `types/index.ts` a partir do schema (seção 5).
9. Recriar as rotas por área (`(admin)`, `(professor)`, `superadmin`, `(public)`, `api`) seguindo a estrutura da seção 8 e os padrões de UI da seção 9 (especialmente o padrão de modal — 9.1).
10. Configurar `next.config.ts` com o hostname do Storage do novo projeto Supabase.
11. Deploy na Vercel, apontar domínio, configurar DNS wildcard se for usar subdomínios de tenant.

---

## 13. Próximos incrementos conhecidos (roadmap)

- Landing: definir preços por licença (hoje a tabela mostra Basic R$129 / Pro R$249 e um quadro explicando as 3 licenças sem preço).
- **Domínio próprio de verdade:** hoje nenhum código marca `custom_domains.verificado = true` (domínio próprio não resolve). Integrar a API de domínios da Vercel (adicionar, verificar, remover) e corrigir as instruções de DNS de `app/(admin)/admin/site/dominio/dominio-form.tsx` (hoje mandam CNAME para `ostricksocial.com.br` e prometem verificação automática inexistente).
- Igreja: eventos e inscrições, portal do membro (atualizar os próprios dados), carteirinha digital, famílias/dependentes, ministérios/células, aniversariantes, importação de planilha de membros, exportação CSV/PDF.
- Módulo financeiro: contas bancárias (`financeiro_contas`), orçamento por projeto, alertas de vencimento, exportação PDF/CSV.
- Portais de `aluno` e `responsavel` (roles já existem no schema/RBAC, painéis ainda não implementados).
- Dívida técnica: `alunos.cpf_encrypted` é gravado em texto puro (nome enganoso); páginas antigas do admin (dashboard, financeiro, alunos) usam `profile.org_id` e ficam vazias na impersonação — migrar para `getCurrentOrg()`.

---

## 14. Manutenção deste documento

Ao trabalhar neste projeto, sempre que uma mudança **arquitetural** for feita (nova tabela, novo módulo/role, nova convenção de UI, nova integração externa, mudança de stack), **atualizar a seção correspondente deste arquivo na mesma tarefa** — não deixar para depois. Mudanças puramente de conteúdo/copy ou bugfix não precisam de atualização aqui.
