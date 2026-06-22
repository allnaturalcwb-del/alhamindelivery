// Asaas API client — Rota Simples SaaS
// Docs: https://docs.asaas.com

const ASAAS_BASE =
  process.env.ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

const ASAAS_KEY = process.env.ASAAS_API_KEY || ''

async function asaasFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_KEY,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Asaas ${path} → ${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function criarCliente(dados: {
  name: string
  cpfCnpj: string
  email?: string
  mobilePhone?: string
}) {
  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function buscarClientePorCpfCnpj(cpfCnpj: string) {
  const clean = cpfCnpj.replace(/\D/g, '')
  const res = await asaasFetch(`/customers?cpfCnpj=${clean}`)
  return res.data?.[0] || null
}

// ─── Cobranças ─────────────────────────────────────────────────────────────────

export type BillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'

export interface CreditCardData {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface CreditCardHolderInfo {
  name: string
  email: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

export async function criarCobranca(dados: {
  customer: string
  billingType: BillingType
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  creditCard?: CreditCardData
  creditCardHolderInfo?: CreditCardHolderInfo
  remoteIp?: string
}) {
  return asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function listarCobrancas(customerId: string) {
  const res = await asaasFetch(`/payments?customer=${customerId}&limit=10&offset=0`)
  return res.data || []
}

export async function buscarCobranca(paymentId: string) {
  return asaasFetch(`/payments/${paymentId}`)
}

// Retorna link de pagamento (Pix ou boleto)
export async function getLinkPagamento(paymentId: string): Promise<{
  pixQrCode?: string
  pixCopiaECola?: string
  bankSlipUrl?: string
  invoiceUrl?: string
}> {
  const [pixRes, payment] = await Promise.allSettled([
    asaasFetch(`/payments/${paymentId}/pixQrCode`),
    asaasFetch(`/payments/${paymentId}`),
  ])

  return {
    pixQrCode: pixRes.status === 'fulfilled' ? pixRes.value?.encodedImage : undefined,
    pixCopiaECola: pixRes.status === 'fulfilled' ? pixRes.value?.payload : undefined,
    invoiceUrl: payment.status === 'fulfilled' ? payment.value?.invoiceUrl : undefined,
    bankSlipUrl: payment.status === 'fulfilled' ? payment.value?.bankSlipUrl : undefined,
  }
}

// ─── Assinaturas recorrentes ────────────────────────────────────────────────────

export async function criarAssinatura(dados: {
  customer: string
  billingType: BillingType
  value: number
  nextDueDate: string     // YYYY-MM-DD — primeira cobrança
  cycle: 'MONTHLY'
  description?: string
  externalReference?: string
}) {
  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function listarAssinaturas(customerId: string) {
  const res = await asaasFetch(`/subscriptions?customer=${customerId}`)
  return res.data || []
}

export async function cancelarAssinatura(subscriptionId: string) {
  return asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

// ─── Helpers de data ──────────────────────────────────────────────────────────

export function proximoVencimento(diaDoMes = 5): string {
  const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  let ano = hoje.getFullYear()
  let mes = hoje.getMonth()
  let data = new Date(ano, mes, diaDoMes)
  if (data <= hoje) data = new Date(ano, mes + 1, diaDoMes)
  return data.toISOString().split('T')[0]
}

export function formatarStatusAsaas(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING:    { label: 'Aguardando pagamento', color: 'yellow' },
    RECEIVED:   { label: 'Pago',                 color: 'green'  },
    CONFIRMED:  { label: 'Confirmado',            color: 'green'  },
    OVERDUE:    { label: 'Vencida',              color: 'red'    },
    REFUNDED:   { label: 'Estornado',            color: 'gray'   },
    CANCELED:   { label: 'Cancelado',            color: 'gray'   },
  }
  return map[status] || { label: status, color: 'gray' }
}
