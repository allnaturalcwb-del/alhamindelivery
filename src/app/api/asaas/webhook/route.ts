// POST /api/asaas/webhook
// Recebe eventos do Asaas e atualiza status dos tenants no Supabase automaticamente.
// Header de segurança: asaas-access-token = ASAAS_WEBHOOK_TOKEN

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usa service_role para bypassar RLS e conseguir atualizar qualquer tenant
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('asaas-access-token')
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.warn('[webhook] Token inválido:', token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, payment } = body

    console.log('[webhook] Evento:', event, '| Payment:', payment?.id, '| Ref:', payment?.externalReference)

    const supabase = adminSupabase()

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        const ref: string = payment?.externalReference || ''

        // Cobrança de implantação paga → ativa tenant
        if (ref.startsWith('implant_')) {
          const userId = ref.replace('implant_', '')
          const { error } = await supabase
            .from('tenants')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
          if (error) console.error('[webhook] Erro ao ativar tenant:', error)
          else console.log('[webhook] ✅ Tenant ativado:', userId)
        }

        // Mensalidade paga → mantém/reativa tenant
        if (ref.startsWith('mens_')) {
          const userId = ref.replace('mens_', '')
          await supabase
            .from('tenants')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
          console.log('[webhook] ✅ Mensalidade confirmada, tenant ativo:', userId)
        }
        break
      }

      case 'PAYMENT_OVERDUE': {
        const ref: string = payment?.externalReference || ''
        if (ref.startsWith('mens_')) {
          const userId = ref.replace('mens_', '')
          await supabase
            .from('tenants')
            .update({ status: 'suspended', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
          console.log('[webhook] ⚠️ Tenant suspenso por inadimplência:', userId)
        }
        break
      }

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED': {
        const ref: string = payment?.externalReference || ''
        if (ref.startsWith('implant_')) {
          const userId = ref.replace('implant_', '')
          await supabase
            .from('tenants')
            .update({ status: 'pending_payment', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
          console.log('[webhook] 🔄 Implantação estornada, tenant voltou a pending:', userId)
        }
        break
      }

      default:
        console.log('[webhook] Evento não tratado:', event)
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[webhook] Erro interno:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Asaas valida o endpoint com GET
export async function GET() {
  return NextResponse.json({ ok: true, service: 'Rota Simples Webhook' })
}
