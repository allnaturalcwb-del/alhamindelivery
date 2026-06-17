// Lógica central de turnos: corte às 16h (horário de Brasília).
// Antes das 16h = manhã. A partir das 16h = noite (até 23:59).

export type Turno = 'manha' | 'noite'

export function getHoraBrasilia(date: Date = new Date()): number {
  return parseInt(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }))
}

// Retorna a data no formato YYYY-MM-DD, no fuso de Brasília
export function getDataBrasilia(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function getTurno(date: Date = new Date()): Turno {
  return getHoraBrasilia(date) < 16 ? 'manha' : 'noite'
}

export function getTurnoInfo(date: Date = new Date()): { turno: Turno; label: string; emoji: string; cor: string } {
  const turno = getTurno(date)
  return turno === 'manha'
    ? { turno, label: 'Manhã', emoji: '🌅', cor: 'bg-amber-100 text-amber-700' }
    : { turno, label: 'Noite', emoji: '🌙', cor: 'bg-indigo-100 text-indigo-700' }
}

// Conta quantos dias distintos (no período informado) tiveram pelo menos
// 1 entrega registrada dentro do turno indicado.
export function contarDiasAtivosPorTurno(entregas: { created_at: string }[], turno: Turno): number {
  return new Set(
    entregas
      .filter(e => getTurno(new Date(e.created_at)) === turno)
      .map(e => getDataBrasilia(new Date(e.created_at)))
  ).size
}
