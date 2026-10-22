import type { Endereco } from '@/types'

// Consulta o CEP no ViaCEP. Retorna null se não encontrado ou em caso de erro de rede.
export async function buscarCep(cep: string): Promise<Pick<Endereco, 'logradouro' | 'bairro' | 'cidade' | 'uf'> | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    }
  } catch {
    return null
  }
}
