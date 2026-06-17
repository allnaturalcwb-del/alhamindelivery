export type Quinzena = {
  inicio: Date
  fim: Date
  label: string
  numero: 1 | 2
  mes: number
  ano: number
}

export function getQuinzenaAtual(date = new Date()): Quinzena {
  const br = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dia = br.getDate()
  const mes = br.getMonth()
  const ano = br.getFullYear()
  const nomeMes = br.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })

  if (dia <= 15) {
    return {
      inicio: new Date(ano, mes, 1, 0, 0, 0),
      fim: new Date(ano, mes, 15, 23, 59, 59, 999),
      label: `1ª Quinzena de ${nomeMes}`,
      numero: 1,
      mes,
      ano,
    }
  } else {
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    return {
      inicio: new Date(ano, mes, 16, 0, 0, 0),
      fim: new Date(ano, mes, ultimoDia, 23, 59, 59, 999),
      label: `2ª Quinzena de ${nomeMes}`,
      numero: 2,
      mes,
      ano,
    }
  }
}

// Retorna a quinzena que acabou de fechar (chamado no dia 16 ou dia 1º)
export function getQuinzenaFechada(): Quinzena | null {
  const br = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dia = br.getDate()
  const mes = br.getMonth()
  const ano = br.getFullYear()

  // Dia 16: 1ª quinzena do mês atual acabou de fechar (01-15)
  if (dia === 16) {
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return {
      inicio: new Date(ano, mes, 1, 0, 0, 0),
      fim: new Date(ano, mes, 15, 23, 59, 59, 999),
      label: `1ª Quinzena de ${nomeMes}`,
      numero: 1,
      mes,
      ano,
    }
  }

  // Dia 1º: 2ª quinzena do mês anterior acabou de fechar (16-último)
  if (dia === 1) {
    const mesAnterior = mes === 0 ? 11 : mes - 1
    const anoAnterior = mes === 0 ? ano - 1 : ano
    const ultimoDia = new Date(anoAnterior, mesAnterior + 1, 0).getDate()
    const nomeMes = new Date(anoAnterior, mesAnterior, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return {
      inicio: new Date(anoAnterior, mesAnterior, 16, 0, 0, 0),
      fim: new Date(anoAnterior, mesAnterior, ultimoDia, 23, 59, 59, 999),
      label: `2ª Quinzena de ${nomeMes}`,
      numero: 2,
      mes: mesAnterior,
      ano: anoAnterior,
    }
  }

  return null
}

// offset: 0 = quinzena atual, -1 = quinzena anterior, -2 = duas quinzenas atrás, etc.
export function getQuinzenaComOffset(offset: number): Quinzena {
  if (offset === 0) return getQuinzenaAtual()

  // Começa da quinzena atual e vai voltando
  let q = getQuinzenaAtual()
  for (let i = 0; i > offset; i--) {
    // Volta um dia antes do início da quinzena atual para pegar a anterior
    const umDiaAntes = new Date(q.inicio.getTime() - 24 * 60 * 60 * 1000)
    q = getQuinzenaAtual(umDiaAntes)
  }
  return q
}

export function formatarPeriodo(q: Quinzena) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  return `${q.inicio.toLocaleDateString('pt-BR', opts)} a ${q.fim.toLocaleDateString('pt-BR', opts)}`
}
