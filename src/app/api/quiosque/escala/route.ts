import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const data = searchParams.get('data')
  const turno = searchParams.get('turno')

  if (!data || !turno) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { data: rows, error } = await supabase
    .from('escala_turno')
    .select('motoboy_id, ativo')
    .eq('data', data)
    .eq('turno', turno)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(rows || [])
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { data, turno, escalas } = body

  if (!data || !turno || !Array.isArray(escalas)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const rows = escalas.map((e: { motoboy_id: string; ativo: boolean }) => ({
    motoboy_id: e.motoboy_id,
    data,
    turno,
    ativo: e.ativo,
  }))

  const { error } = await supabase
    .from('escala_turno')
    .upsert(rows, { onConflict: 'motoboy_id,data,turno' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
