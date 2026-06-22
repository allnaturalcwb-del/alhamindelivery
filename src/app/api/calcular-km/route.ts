 import { NextRequest, NextResponse } from 'next/server'

const ORIGEM = 'Av. Silva Jardim 2424, Batel, Curitiba, PR, Brazil'

export async function GET(req: NextRequest) {
  const destino = req.nextUrl.searchParams.get('destino')
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!destino) return NextResponse.json({ error: 'Destino obrigatório' }, { status: 400 })
  if (!apiKey) return NextResponse.json({ km: null, manual: true })
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(ORIGEM)}&destinations=${encodeURIComponent(destino + ', Curitiba, PR, Brazil')}&key=${apiKey}&units=metric&language=pt-BR`
    const res = await fetch(url)
    const data = await res.json()
    const elemento = data.rows?.[0]?.elements?.[0]
    if (elemento?.status === 'OK') {
      const km = Math.round((elemento.distance.value / 1000) * 10) / 10
      return NextResponse.json({ km, endereco: data.destination_addresses?.[0] })
    }
    return NextResponse.json({ km: null, manual: true })
  } catch {
    return NextResponse.json({ km: null, manual: true })
  }
}
