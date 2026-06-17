import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const motoboyId = searchParams.get('motoboy_id')
  const tipo = searchParams.get('tipo') // 'hoje' | 'motoboys' | 'enderecos'

  if (tipo === 'motoboys') {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'motoboy').eq('ativo', true).order('nome')
    return NextResponse.json(data || [])
  }

  if (tipo === 'enderecos') {
    const { data } = await supabase.from('enderecos_favoritos').select('*').eq('ativo', true).order('nome')
    return NextResponse.json(data || [])
  }

  if (tipo === 'hoje' && motoboyId) {
    const agora = new Date()
    // Calcula meia-noite BRT corretamente — evita bug quando servidor roda em UTC
    const brtNow = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const offsetMs = agora.getTime() - brtNow.getTime()
    const diaStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const hoje = new Date(new Date(diaStr + 'T00:00:00Z').getTime() + offsetMs)
    const { data } = await supabase.from('entregas').select('*')
      .eq('motoboy_id', motoboyId)
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: false })
    return NextResponse.json(data || [])
  }

  if (tipo === 'perfil' && motoboyId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', motoboyId).single()
    return NextResponse.json(data)
  }

  return NextResponse.json([])
}

const AUTO_SAVE_THRESHOLD = 3

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { motoboy_id, tipo, codigo_ifood, endereco_destino, km_calculado, valor_km, endereco_livre } = body

  if (!motoboy_id || !endereco_destino || !valor_km) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { data, error } = await supabase.from('entregas').insert({
    motoboy_id, tipo, codigo_ifood: codigo_ifood || null,
    endereco_destino, km_calculado, valor_km,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-salvar endereços digitados manualmente após N usos
  if (endereco_livre && endereco_destino) {
    const endLimpo = endereco_destino.split(' (iFood')[0].trim()

    // Busca contagem atual
    const { data: contagem } = await supabase
      .from('enderecos_contagem')
      .select('id, contagem')
      .eq('endereco_completo', endLimpo)
      .single()

    if (contagem) {
      const novaContagem = contagem.contagem + 1
      await supabase.from('enderecos_contagem')
        .update({ contagem: novaContagem, ultimo_uso: new Date().toISOString() })
        .eq('id', contagem.id)

      // Atingiu threshold — adiciona aos favoritos se ainda não existe
      if (novaContagem >= AUTO_SAVE_THRESHOLD) {
        const { data: jaExiste } = await supabase
          .from('enderecos_favoritos')
          .select('id')
          .eq('endereco_completo', endLimpo)
          .single()

        if (!jaExiste) {
          await supabase.from('enderecos_favoritos').insert({
            nome: endLimpo,
            endereco_completo: endLimpo,
            ativo: true,
          })
        }
      }
    } else {
      // Primeira vez — cria registro de contagem
      await supabase.from('enderecos_contagem').insert({
        endereco_completo: endLimpo,
        contagem: 1,
        ultimo_uso: new Date().toISOString(),
      })
    }
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { motoboy_id, ids } = body

  if (!motoboy_id || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { error } = await supabase.from('entregas')
    .update({ enviado_go: true })
    .eq('motoboy_id', motoboy_id)
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
