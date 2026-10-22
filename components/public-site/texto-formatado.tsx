// Formatação leve para textos longos digitados no painel (história, sobre).
// Entende um Markdown mínimo — sem HTML cru, então é seguro contra XSS:
//   # Título · ## Subtítulo · - item de lista · **negrito** · *itálico*
//   Parágrafo inteiro em **negrito** vira citação em destaque.

type Bloco =
  | { tipo: 'titulo'; nivel: 1 | 2; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'destaque'; texto: string }
  | { tipo: 'paragrafo'; texto: string }

export function parseTexto(texto: string): Bloco[] {
  const blocos: Bloco[] = []
  for (const bruto of texto.replace(/\r/g, '').split(/\n\s*\n/)) {
    const linhas = bruto.split('\n').map(l => l.trim()).filter(Boolean)
    if (!linhas.length) continue
    const titulo = /^(#{1,3})\s+(.*)$/.exec(linhas[0])
    if (titulo && linhas.length === 1) {
      blocos.push({ tipo: 'titulo', nivel: titulo[1].length === 1 ? 1 : 2, texto: titulo[2] })
      continue
    }
    if (linhas.every(l => /^[-*•]\s+/.test(l))) {
      blocos.push({ tipo: 'lista', itens: linhas.map(l => l.replace(/^[-*•]\s+/, '')) })
      continue
    }
    const junto = linhas.join(' ')
    const destaque = /^\*\*(.+)\*\*$/.exec(junto)
    if (destaque && !destaque[1].includes('**')) blocos.push({ tipo: 'destaque', texto: destaque[1] })
    else blocos.push({ tipo: 'paragrafo', texto: junto.replace(/^#{1,3}\s+/, '') })
  }
  return blocos
}

// **negrito** e *itálico* dentro de uma linha
function Inline({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).filter(Boolean)
  return (
    <>
      {partes.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-gray-900 escuro:text-white">{p.slice(2, -2)}</strong>
        if (/^(\*[^*].*\*|_.+_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

export default function TextoFormatado({ texto, cor, primeiroComoLead = false }: {
  texto: string
  cor: string
  /** Primeiro parágrafo maior (abertura do texto) */
  primeiroComoLead?: boolean
}) {
  const blocos = parseTexto(texto)
  const idxLead = primeiroComoLead ? blocos.findIndex(b => b.tipo === 'paragrafo') : -1

  return (
    <div className="space-y-5">
      {blocos.map((b, i) => {
        if (b.tipo === 'titulo') {
          return b.nivel === 1
            ? <h3 key={i} className="font-serif text-2xl sm:text-3xl font-semibold text-gray-900 escuro:text-white leading-snug"><Inline texto={b.texto} /></h3>
            : <h4 key={i} className="text-lg font-semibold text-gray-900 escuro:text-white pt-2"><Inline texto={b.texto} /></h4>
        }
        if (b.tipo === 'lista') {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {b.itens.map((item, j) => (
                <li key={j} className="flex gap-3 text-[17px] leading-8 text-gray-700 escuro:text-neutral-300">
                  <span className="mt-3 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                  <span><Inline texto={item} /></span>
                </li>
              ))}
            </ul>
          )
        }
        if (b.tipo === 'destaque') {
          return (
            <blockquote key={i} className="my-8 pl-5 border-l-4 font-serif text-xl sm:text-2xl leading-relaxed text-gray-900 escuro:text-white" style={{ borderColor: cor }}>
              <Inline texto={b.texto} />
            </blockquote>
          )
        }
        return (
          <p key={i} className={i === idxLead ? 'text-lg sm:text-xl leading-relaxed text-gray-800 escuro:text-neutral-200' : 'text-[17px] leading-8 text-gray-700 escuro:text-neutral-300'}>
            <Inline texto={b.texto} />
          </p>
        )
      })}
    </div>
  )
}
