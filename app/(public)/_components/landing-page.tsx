import Link from 'next/link'
import {
  Users, BookOpen, Heart, Globe, Shield, FileSignature,
  Landmark, Check, X, ArrowRight, Zap, ChevronRight, Church,
} from 'lucide-react'

const BRAND = '#1e40af'

const FEATURES: Array<{ icon: typeof Users; title: string; desc: string; badge?: string }> = [
  {
    icon: Church,
    title: 'Cadastro de Membros',
    desc: 'Formulário simples pelo celular — para quem já é membro ou quer ser, por aclamação, transferência ou batismo. Com LGPD.',
  },
  {
    icon: Globe,
    title: 'Página da Igreja',
    desc: 'Perfil público com capa, história, horários de culto, endereço e liderança — no seu subdomínio ou domínio próprio.',
  },
  {
    icon: Users,
    title: 'Projeto Social: Alunos',
    desc: 'Fichas completas, matrículas, histórico e acompanhamento individual de cada beneficiário.',
  },
  {
    icon: BookOpen,
    title: 'Turmas e Chamada',
    desc: 'Organize horários, registre presença, compartilhe materiais e acompanhe atividades por turma.',
  },
  {
    icon: Heart,
    title: 'Voluntariado',
    desc: 'Gerencie candidaturas, aprovações e acompanhe a equipe de voluntários em um só lugar.',
  },
  {
    icon: Shield,
    title: 'Controle de Acesso',
    desc: 'Papéis distintos para admin, funcionário e professor — cada um vê apenas o que precisa.',
  },
  {
    icon: FileSignature,
    title: 'Termos Digitais',
    desc: 'Fichas de alunos e termos de voluntariado com assinatura digital via link único.',
  },
  {
    icon: Landmark,
    title: 'Gestão Financeira',
    desc: 'Fluxo de caixa, controle de receitas e despesas, e relatórios financeiros completos.',
  },
]

const STEPS = [
  { num: '1', title: 'Cadastre sua igreja', desc: 'Crie a conta e monte a página pública da igreja em minutos.' },
  { num: '2', title: 'Compartilhe o cadastro', desc: 'Envie o link ou o QR code do cadastro de membros — no boletim, no telão ou no WhatsApp.' },
  { num: '3', title: 'Comece a usar', desc: 'Sua equipe já acessa com as permissões certas. Sem treinamento complexo.' },
]

type PlanFeature = { label: string; basic: boolean | string; pro: boolean | string }

const PLAN_FEATURES: PlanFeature[] = [
  { label: 'Cadastro de membros',         basic: true,           pro: true },
  { label: 'Alunos (projeto social)',                      basic: 'até 300',      pro: 'Ilimitado' },
  { label: 'Usuários',                    basic: '10 usuários',  pro: 'Ilimitado' },
  { label: 'Site público',                basic: true,           pro: 'com domínio próprio' },
  { label: 'Turmas e chamadas',           basic: true,           pro: true },
  { label: 'Voluntariado',               basic: true,           pro: true },
  { label: 'Termos com assinatura digital', basic: true,         pro: true },
  { label: 'Relatórios',                 basic: 'Completo',     pro: 'Exportação incluída' },
  { label: 'Gestão Financeira',          basic: false,          pro: true },
  { label: 'Suporte',                    basic: 'Email',        pro: 'Prioritário' },
]

function FeatureValue({ val }: { val: boolean | string }) {
  if (val === false) return <X size={16} className="text-gray-300 mx-auto" />
  if (val === true) return <Check size={16} className="text-emerald-500 mx-auto" />
  return <span className="text-sm text-gray-700">{val}</span>
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ backgroundColor: BRAND }}
            >
              OS
            </div>
            <span className="font-bold text-gray-900">Ostrick Social</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#planos" className="text-sm text-gray-500 hover:text-gray-900 transition hidden sm:block">
              Planos
            </a>
            <Link
              href="/entrar"
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 transition"
            >
              Entrar <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-6">
        {/* fundo gradiente */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${BRAND}, transparent)` }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: `${BRAND}12`, color: BRAND }}
          >
            <Zap size={12} /> Gestão para igrejas e seus projetos sociais
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
            Gerencie sua igreja<br className="hidden sm:block" />
            <span style={{ color: BRAND }}> com simplicidade</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cadastro de membros, página da igreja e, se houver, o projeto social com alunos,
            turmas e voluntários — tudo em um só lugar, feito para igrejas brasileiras.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#planos"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm shadow-lg hover:opacity-90 transition"
              style={{ backgroundColor: BRAND }}
            >
              Começar 15 dias grátis <ArrowRight size={16} />
            </a>
            <a
              href="#funcionalidades"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-gray-700 font-semibold text-sm border border-gray-200 hover:border-gray-300 transition"
            >
              Ver funcionalidades
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">Sem cartão de crédito. Cancele quando quiser.</p>
        </div>

        {/* Preview visual */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-50">
            {/* Barra de janela fake */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 max-w-xs">
                  app.ostricksocial.com.br/admin
                </div>
              </div>
            </div>
            {/* Mockup do dashboard */}
            <div className="flex bg-white" style={{ minHeight: 320 }}>
              {/* Sidebar fake */}
              <div className="w-48 bg-white border-r border-gray-100 p-3 hidden sm:block shrink-0">
                {['Dashboard', 'Alunos', 'Turmas', 'Voluntariado', 'Site Público', 'Configurações'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-0.5 font-medium ${i === 0 ? 'text-white' : 'text-gray-500'}`}
                    style={i === 0 ? { backgroundColor: BRAND } : {}}
                  >
                    <div className={`w-3 h-3 rounded-sm ${i === 0 ? 'bg-white/50' : 'bg-gray-200'}`} />
                    {item}
                  </div>
                ))}
              </div>
              {/* Conteúdo fake */}
              <div className="flex-1 p-6">
                <div className="mb-4">
                  <div className="h-5 w-32 bg-gray-900 rounded font-bold text-sm flex items-center px-1 text-gray-900">
                    <span className="text-sm font-bold">Dashboard</span>
                  </div>
                  <div className="h-3 w-48 bg-gray-100 rounded mt-1.5" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Alunos ativos', val: '47' },
                    { label: 'Turmas', val: '6' },
                    { label: 'Voluntários', val: '12' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-medium text-gray-400 mb-2">Atividade recente</p>
                  {['Novo aluno cadastrado', 'Chamada registrada — Turma A', 'Termo assinado digitalmente'].map(t => (
                    <div key={t} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND }} />
                      <span className="text-xs text-gray-600">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Tudo que sua igreja precisa
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Módulos integrados para que sua equipe foque no que importa: as pessoas.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, badge }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition group">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${BRAND}12` }}
                >
                  <Icon size={20} style={{ color: BRAND }} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  {badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Como funciona</h2>
            <p className="text-gray-500">Comece a usar em menos de 10 minutos.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-sm"
                  style={{ backgroundColor: BRAND }}
                >
                  {num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Planos e preços</h2>
            <p className="text-gray-500">Escolha a licença e o plano ideais para a sua igreja.</p>
          </div>

          {/* Licenças: o que cada uma libera */}
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {[
              { t: 'Igreja', d: 'Cadastro de membros e página da igreja.' },
              { t: 'Igreja + Projeto Social', d: 'Tudo da igreja, mais alunos, turmas e voluntariado do projeto social.' },
              { t: 'Projeto Social', d: 'Para ONGs e projetos sem igreja: alunos, turmas e voluntariado.' },
            ].map(l => (
              <div key={l.t} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-900 text-sm">{l.t}</p>
                <p className="text-xs text-gray-500 mt-1">{l.d}</p>
              </div>
            ))}
          </div>

          {/* Banner trial */}
          <div
            className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-3 rounded-xl mb-8 text-center"
            style={{ backgroundColor: `${BRAND}10`, color: BRAND }}
          >
            <Zap size={15} />
            15 dias grátis em qualquer plano — sem cartão de crédito
          </div>

          <div className="grid sm:grid-cols-2 gap-6">

            {/* Basic */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <p className="text-sm font-semibold text-gray-500 mb-1">Basic</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">
                R$ 129<span className="text-lg font-normal text-gray-400">/mês</span>
              </p>
              <p className="text-sm text-gray-400 mb-6">após os 15 dias grátis</p>
              <a
                href="/entrar"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 font-semibold text-sm transition hover:bg-gray-50"
                style={{ borderColor: BRAND, color: BRAND }}
              >
                Começar 15 dias grátis
              </a>
              <div className="mt-8 space-y-3">
                {PLAN_FEATURES.map(f => (
                  <div key={f.label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">{f.label}</span>
                    <div className="text-right"><FeatureValue val={f.basic} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro — Recomendado */}
            <div
              className="rounded-2xl p-8 relative"
              style={{ backgroundColor: BRAND }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                  ⭐ Recomendado
                </span>
              </div>
              <p className="text-sm font-semibold text-blue-200 mb-1">Pro</p>
              <p className="text-4xl font-bold text-white mb-1">
                R$ 249<span className="text-lg font-normal text-blue-200">/mês</span>
              </p>
              <p className="text-sm text-blue-300 mb-6">após os 15 dias grátis</p>
              <a
                href="/entrar"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white font-semibold text-sm transition hover:bg-blue-50"
                style={{ color: BRAND }}
              >
                Começar 15 dias grátis <ChevronRight size={16} />
              </a>
              <div className="mt-8 space-y-3">
                {PLAN_FEATURES.map(f => (
                  <div key={f.label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-blue-100">{f.label}</span>
                    <div className="text-right text-white">
                      {f.pro === false ? (
                        <X size={16} className="text-blue-400 mx-auto" />
                      ) : f.pro === true ? (
                        <Check size={16} className="text-emerald-300 mx-auto" />
                      ) : (
                        <span className="text-sm text-white">{f.pro}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Precisa de algo diferente?{' '}
            <a href="mailto:contato@ostricksocial.com.br" className="underline hover:text-gray-600">
              Fale com a equipe
            </a>
          </p>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section
        className="py-24 px-6 text-white text-center"
        style={{ backgroundColor: BRAND }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para organizar a sua igreja?
          </h2>
          <p className="text-blue-200 mb-8 text-lg">
            15 dias grátis, sem cartão. Comece hoje e veja a diferença.
          </p>
          <a
            href="/entrar"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white font-bold rounded-full text-sm shadow-lg hover:bg-blue-50 transition"
            style={{ color: BRAND }}
          >
            Criar conta gratuita <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
              style={{ backgroundColor: BRAND }}
            >
              OS
            </div>
            <span className="font-semibold text-white text-sm">Ostrick Social</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#planos" className="hover:text-white transition">Planos</a>
            <Link href="/entrar" className="hover:text-white transition">Entrar</Link>
            <a href="mailto:contato@ostricksocial.com.br" className="hover:text-white transition">Contato</a>
          </div>
          <p className="text-xs text-gray-600">© 2025 Ostrick Social</p>
        </div>
      </footer>

    </div>
  )
}
