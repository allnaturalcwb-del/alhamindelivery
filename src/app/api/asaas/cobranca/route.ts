// POST /api/asaas/cobranca
// Cria cobrança avulsa (implantação) ou assinatura mensal no Asaas

import { NextRequest, NextResponse } from 'next/server'
import {
  buscarClientePorCpfCnpj,
  criarCliente,
  criarCobranca,
  criarAssinatura,
  getLinkPagamento,
  proximoVencimento,
} from '@/lib/asaas'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const {
      tipo,           // 'implantacao' | 'mensalidade'
      nome,
      cpfCnpj,
      email,
      telefone,
      plano,          // 'starter' | 'crescimento' | 'rede'
    } = body

    // Valores por plano
    const planos: Record<string, { mensalidade: number; implantacao: number; descricao: string }> = {
      starter:     { mensalidade: 149, implantacao: 497, descricao: 'Rota Simples Starter — 1 unidade, até 3 motoboys' },
      crescimento: { mensalidade: 249, implantacao: 797, descricao: 'Rota Simples Crescimento — 1 unidade, até 8 motoboys' },
      rede:        { mensalidade: 349, implantacao: 997, descricao: 'Rota Simples Rede — 3 unidades, motoboys ilimitados' },
      custom:      { mensalidade: body.valorMensalidade || 197, implantacao: body.valorImplantacao || 147, descricao: body.descricaoCustom || 'Rota Simples — Plano Personalizado' },
    }

    const cfg = planos[plano] || planos.custom

    // Busca ou cria cliente no Asaas
    let cliente = await buscarClientePorCpfCnpj(cpfCnpj)
    if (!cliente) {
      cliente = await criarCliente({ name: nome, cpfCnpj, email, mobilePhone: telefone })
    }

    let resultado: Record<string, unknown> = {}

    if (tipo === 'implantacao') {
      // Cobrança avulsa de implantação via Pix
      const cobranca = await criarCobranca({
        customer: cliente.id,
        billingType: 'PIX',
        value: body.valorCustom || cfg.implantacao,
        dueDate: proximoVencimento(new Date().getDate() + 3 > 28 ? 5 : new Date().getDate() + 3),
        description: `Implantação ${cfg.descricao}`,
        externalReference: `implant_${Date.now()}`,
      })
      const links = await getLinkPagamento(cobranca.id)
      resultado = { cobranca, links, clienteAsaas: cliente }

    } else if (tipo === 'mensalidade') {
      // Assinatura mensal recorrente
      const assinatura = await criarAssinatura({
        customer: cliente.id,
        billingType: 'BOLETO',
        value: body.valorCustom || cfg.mensalidade,
        nextDueDate: proximoVencimento(5),
        cycle: 'MONTHLY',
        description: `Mensalidade ${cfg.descricao}`,
        externalReference: `mens_${Date.now()}`,
      })
      resultado = { assinatura, clienteAsaas: cliente }

    } else {
      return NextResponse.json({ error: 'tipo deve ser implantacao ou mensalidade' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, ...resultado })
  } catch (e: unknown) {
    console.error('[asaas/cobranca]', e)
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
