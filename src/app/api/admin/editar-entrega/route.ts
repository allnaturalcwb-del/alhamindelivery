import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const ORIGEM = process.env.TENANT_ORIGEM || 'Curitiba, PR, Brazil'

function calcularValorPorKm(km: number): number {
  if (km <= 3) return 6
  if (km <= 5) return 8
  if (km <= 7) return 10
  if (km <= 10) return 13
  if (km <= 13) return 16
  return 18
}

async function calcularKm(destino: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(ORIGEM)}&destinations=${encodeURIComponent(destino + ', Curitiba, PR, Brazil')}&key=${apiKey}&units=metric&language=pt-BR`
    const res = await fetch(url)
    const data = await res.json()
    const elemento = data.rows?.[0]?.elements?.[0]
    if (elemento?.status === 'OK') {
      return Math.round((elemento.distance.value / 1000) * 10) / 10
    }
    return null
  } catch {
    return null
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient()
  const { id, endereco_destino } = await req.json()

  if (!id || !endereco_destino) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Remove sufixo "(iFood #codigo)" antes de calcular a distância
  const enderecoParaCalculo = endereco_destino.split(' (iFood')[0].trim()
  const km = await calcularKm(enderecoParaCalculo)

  const updatePayload: Record<string, unknown> = { endereco_destino }
  if (km !== null) {
    updatePayload.km_calculado = km
    updatePayload.valor_km = calcularValorPorKm(km)
  }

  const { data, error } = await supabase
    .from('entregas')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
