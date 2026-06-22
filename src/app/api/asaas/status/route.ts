// GET /api/asaas/status?cpfCnpj=xxx
// Retorna cobranças e assinaturas de um cliente pelo CPF/CNPJ

import { NextRequest, NextResponse } from 'next/server'
import { buscarClientePorCpfCnpj, listarCobrancas, listarAssinaturas } from '@/lib/asaas'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins' }, { status: 403 })
    }

    const cpfCnpj = req.nextUrl.searchParams.get('cpfCnpj') || ''
    if (!cpfCnpj) return NextResponse.json({ error: 'cpfCnpj obrigatório' }, { status: 400 })

    const cliente = await buscarClientePorCpfCnpj(cpfCnpj)
    if (!cliente) return NextResponse.json({ cliente: null, cobrancas: [], assinaturas: [] })

    const [cobrancas, assinaturas] = await Promise.all([
      listarCobrancas(cliente.id),
      listarAssinaturas(cliente.id),
    ])

    return NextResponse.json({ cliente, cobrancas, assinaturas })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
