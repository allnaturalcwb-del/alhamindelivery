'use client'

import { useState } from 'react'
import Image from 'next/image'

type Aba = 'pix' | 'cartao'

interface FormData {
  nomeEmpresa: string
  cpfCnpj: string
  telefone: string
  // Cartão
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
  cep: string
  addressNumber: string
}

export default function PagamentoPage() {
  const [aba, setAba] = useState<Aba>('pix')
  const [form, setForm] = useState<FormData>({
    nomeEmpresa: '',
    cpfCnpj: '',
    telefone: '',
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    cep: '',
    addressNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  // Estado após pagamento
  const [pixQrCode, setPixQrCode] = useState('')
  const [pixCopiaECola, setPixCopiaECola] = useState('')
  const [pago, setPago] = useState(false)

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const mascaraCpfCnpj = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 14)
    if (n.length <= 11)
      return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  async function pagar() {
    setErro('')
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        nomeEmpresa: form.nomeEmpresa,
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
        email: '', // preenchido via auth no server
        telefone: form.telefone,
        formaPagamento: aba === 'pix' ? 'PIX' : 'CREDIT_CARD',
      }

      if (aba === 'cartao') {
        payload.creditCard = {
          holderName: form.holderName,
          number: form.number.replace(/\s/g, ''),
          expiryMonth: form.expiryMonth,
          expiryYear: form.expiryYear,
          ccv: form.ccv,
        }
        payload.creditCardHolderInfo = {
          name: form.nomeEmpresa,
          email: '',
          cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
          postalCode: form.cep.replace(/\D/g, ''),
          addressNumber: form.addressNumber,
          phone: form.telefone.replace(/\D/g, ''),
        }
      }

      const res = await fetch('/api/asaas/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro ao processar pagamento')

      if (aba === 'pix') {
        setPixQrCode(data.pixQrCode || '')
        setPixCopiaECola(data.pixCopiaECola || '')
      } else {
        // Cartão confirmado na hora
        if (data.statusCobranca === 'CONFIRMED' || data.statusCobranca === 'RECEIVED') {
          setPago(true)
        } else {
          throw new Error('Cartão não aprovado. Verifique os dados e tente novamente.')
        }
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // ─── Tela: pagamento aprovado ────────────────────────────────────────────────
  if (pago) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento confirmado!</h1>
          <p className="text-gray-500 mb-6">
            Seu acesso à Rota Simples foi liberado. Bem-vindo!
          </p>
          <a
            href="/"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition"
          >
            Acessar o sistema →
          </a>
        </div>
      </div>
    )
  }

  // ─── Tela: QR Code Pix gerado ────────────────────────────────────────────────
  if (pixCopiaECola) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Pague via Pix</h1>
          <p className="text-gray-500 text-sm mb-4">
            Valor: <strong>R$ 147,00</strong> (implantação única)
          </p>
          {pixQrCode && (
            <div className="flex justify-center mb-4">
              <Image
                src={`data:image/png;base64,${pixQrCode}`}
                alt="QR Code Pix"
                width={200}
                height={200}
                className="rounded-xl border"
              />
            </div>
          )}
          <p className="text-xs text-gray-400 mb-2">Ou copie o código:</p>
          <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600 break-all mb-4 text-left font-mono">
            {pixCopiaECola}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(pixCopiaECola)
              alert('Copiado!')
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl mb-3 transition"
          >
            📋 Copiar código Pix
          </button>
          <p className="text-xs text-gray-400">
            Após o pagamento, seu acesso é liberado automaticamente em até 2 minutos.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Mensalidade de <strong>R$ 197,00</strong> a partir do próximo mês — cobrada automaticamente.
          </p>
        </div>
      </div>
    )
  }

  // ─── Formulário principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500">🛵 Rota Simples</h1>
          <p className="text-gray-500 text-sm mt-1">Ative seu plano para começar</p>
        </div>

        {/* Resumo do plano */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Implantação (única):</span>
            <span className="font-bold text-gray-800">R$ 147,00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Mensalidade (recorrente):</span>
            <span className="font-bold text-gray-800">R$ 197,00/mês</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Plano 3 unidades · Motoboys ilimitados</p>
        </div>

        {/* Dados da empresa */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 font-medium">Nome da empresa</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Ex: Pizzaria Central"
              value={form.nomeEmpresa}
              onChange={set('nomeEmpresa')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">CPF / CNPJ</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="000.000.000-00"
                value={form.cpfCnpj}
                onChange={e => setForm(f => ({ ...f, cpfCnpj: mascaraCpfCnpj(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">WhatsApp</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="(41) 99999-0000"
                value={form.telefone}
                onChange={set('telefone')}
              />
            </div>
          </div>
        </div>

        {/* Abas Pix / Cartão */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setAba('pix')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
              aba === 'pix'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
            }`}
          >
            🔑 Pix
          </button>
          <button
            onClick={() => setAba('cartao')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
              aba === 'cartao'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
            }`}
          >
            💳 Cartão de crédito
          </button>
        </div>

        {/* Pix */}
        {aba === 'pix' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 mb-5">
            <p className="font-semibold mb-1">✅ Mais rápido e sem taxas</p>
            <p className="text-xs text-green-600">
              Após clicar em &quot;Gerar Pix&quot;, você verá o QR Code. O acesso é liberado automaticamente após a confirmação.
            </p>
          </div>
        )}

        {/* Cartão */}
        {aba === 'cartao' && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs text-gray-500 font-medium">Nome no cartão</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300 uppercase"
                placeholder="JOÃO DA SILVA"
                value={form.holderName}
                onChange={set('holderName')}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Número do cartão</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                value={form.number}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 16)
                  setForm(f => ({ ...f, number: v.replace(/(.{4})/g, '$1 ').trim() }))
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Mês</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="12"
                  maxLength={2}
                  value={form.expiryMonth}
                  onChange={set('expiryMonth')}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Ano</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="2028"
                  maxLength={4}
                  value={form.expiryYear}
                  onChange={set('expiryYear')}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">CVV</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  value={form.ccv}
                  onChange={set('ccv')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">CEP</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="80000-000"
                  maxLength={9}
                  value={form.cep}
                  onChange={set('cep')}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Número endereço</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="123"
                  value={form.addressNumber}
                  onChange={set('addressNumber')}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              🔒 Seus dados são enviados diretamente ao Asaas (PCI DSS). A Rota Simples não armazena dados do cartão.
            </p>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-4">
            ⚠️ {erro}
          </div>
        )}

        <button
          onClick={pagar}
          disabled={loading || !form.nomeEmpresa || !form.cpfCnpj}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-base"
        >
          {loading
            ? 'Processando...'
            : aba === 'pix'
              ? '🔑 Gerar Pix — R$ 147,00'
              : '💳 Pagar R$ 147,00 no cartão'}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Pagamento seguro via Asaas · Mensalidade cobrada a partir do próximo mês
        </p>
      </div>
    </div>
  )
}
