 export const ORIGEM = 'Av. Silva Jardim 2424, Batel, Curitiba, PR, Brazil'

export function calcularValorPorKm(km: number): number {
  if (km <= 3) return 6
  if (km <= 5) return 8
  if (km <= 7) return 10
  if (km <= 10) return 13
  if (km <= 13) return 16
  return 18
}

export function formatarValor(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
