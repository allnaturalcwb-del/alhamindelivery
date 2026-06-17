import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const input = searchParams.get('input')
  if (!input || input.length < 3) return NextResponse.json([])

  const key = process.env.GOOGLE_MAPS_API_KEY
  // location + radius + strictbounds = restrito à Grande Curitiba (raio 40 km)
  const CURITIBA_LAT = -25.4284
  const CURITIBA_LNG = -49.2733
  const RAIO_METROS = 40000
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:br&language=pt-BR&location=${CURITIBA_LAT},${CURITIBA_LNG}&radius=${RAIO_METROS}&strictbounds=true&key=${key}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    const suggestions = (data.predictions || []).map((p: { description: string }) => p.description)
    return NextResponse.json(suggestions)
  } catch {
    return NextResponse.json([])
  }
}
