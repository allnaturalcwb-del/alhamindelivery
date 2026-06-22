// POST /api/asaas/onboarding
// Chamado na tela de pagamento do novo cliente.
// Cria o cliente no Asaas, gera cobrança (Pix ou cartão) e já cria a assinatura mensal.
// Registra o tenant no Supabase com status pending_payment.

import { NextRequest, NextResponse } from 'next/server'
import {
  buscarClientePorCpfCnpj,
  criarCliente,
  criarCobranca,
  criarAssinatura,
  getLinkPagamento,
  proximoVencimento,
  CreditCardData,
  CreditCardHolderInfo,
} from '@/lib/asaas'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const {
      nomeEmpresa,
      cpfCnpj,
      email,
      telefone,
      unidades = 1,
      valorImplantacao = 147,
      valorMensalidade = 197,
      // 'PIX' | 'CREDIT_CARD'
      formaPagamento = 'PIX',
      // Somente para cartão:
      creditCard,
      creditCardHolderInfo,
      remoteIp,
    }: {
      nomeEmpresa: string
      cpfCnpj: string
      email: string
      telefone?: string
      unidades?: number
      valorImplantacao?: number
      valorMensalidade?: number
      formaPagamento?: 'PIX' | 'CREDIT_CARD'
      creditCard?: CreditCardData
      creditCardHolderInfo?: CreditCardHolderInfo
      remoteIp?: string
    } = body

    // 1. Upsert tenant no Supabase (garante que existe antes do pagamento)
    const { error: tenantErr } = await supabase.from('tenants').upsert({
      user_id: user.id,
      nome_empresa: nomeEmpresa,
      cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
      email,
      telefone,
      unidades,
      valor_implantacao: valorImplantacao,
      valor_mensalidade: valorMensalidade,
      status: 'pending_payment',
    }, { onConflict: 'user_id' })

    if (tenantErr) throw new Error(`Supabase tenant: ${tenantErr.message}`)

    // 2. Busca ou cria cliente no Asaas
    let cliente = await buscarClientePorCpfCnpj(cpfCnpj)
    if (!cliente) {
      cliente = await criarCliente({
        name: nomeEmpresa,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        email,
        mobilePhone: telefone,
      })
    }

    // Salva asaas_customer_id no tenant
    await supabase.from('tenants')
      .update({ asaas_customer_id: cliente.id })
      .eq('user_id', user.id)

    // 3. Cobrança de implantação
    const dueDate = proximoVencimento(new Date().getDate() + 2 > 28 ? 5 : new Date().getDate() + 2)
    const descImplantacao = `Implantação Rota Simples — ${unidades} unidade${unidades > 1 ? 's' : ''}`

    const cobrancaPayload: Parameters<typeof criarCobranca>[0] = {
      customer: cliente.id,
      billingType: formaPagamento,
      value: valorImplantacao,
      dueDate,
      description: descImplantacao,
      externalReference: `implant_${user.id}`,
    }

    if (formaPagamento === 'CREDIT_CARD' && creditCard && creditCardHolderInfo) {
      cobrancaPayload.creditCard = creditCard
      cobrancaPayload.creditCardHolderInfo = creditCardHolderInfo
      cobrancaPayload.remoteIp = remoteIp || '127.0.0.1'
    }

    const cobranca = await criarCobranca(cobrancaPayload)

    // Salva ID da cobrança de implantação
    await supabase.from('tenants')
      .update({ asaas_implantacao_id: cobranca.id })
      .eq('user_id', user.id)

    // 4. Assinatura mensal (começa no próximo dia 5)
    const assinatura = await criarAssinatura({
      customer: cliente.id,
      billingType: formaPagamento === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX',
      value: valorMensalidade,
      nextDueDate: proximoVencimento(5),
      cycle: 'MONTHLY',
      description: `Mensalidade Rota Simples — ${unidades} unidade${unidades > 1 ? 's' : ''}`,
      externalReference: `mens_${user.id}`,
      ...(formaPagamento === 'CREDIT_CARD' && creditCard && creditCardHolderInfo ? {
        creditCard,
        creditCardHolderInfo,
        remoteIp: remoteIp || '127.0.0.1',
      } : {}),
    })

    // Salva ID da assinatura
    await supabase.from('tenants')
      .update({ asaas_subscription_id: assinatura.id })
      .eq('user_id', user.id)

    // 5. Se Pix, busca QR code
    let pixQrCode: string | undefined
    let pixCopiaECola: string | undefined
    let invoiceUrl: string | undefined

    if (formaPagamento === 'PIX') {
      const links = await getLinkPagamento(cobranca.id)
      pixQrCode = links.pixQrCode
      pixCopiaECola = links.pixCopiaECola
      invoiceUrl = links.invoiceUrl
    }

    return NextResponse.json({
      ok: true,
      formaPagamento,
      cobrancaId: cobranca.id,
      // Pix
      pixQrCode,
      pixCopiaECola,
      invoiceUrl,
      // Cartão: status vem direto (CONFIRMED se aprovado)
      statusCobranca: cobranca.status,
      // Assinatura
      assinaturaId: assinatura.id,
    })

  } catch (e: unknown) {
    console.error('[asaas/onboarding]', e)
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
