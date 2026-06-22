'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('Email ou senha incorretos.'); setCarregando(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'admin') { window.location.href = '/admin'; return }

    // Verifica se é cliente SaaS com múltiplas unidades
    const { data: tenant } = await supabase.from('tenants').select('id, status').eq('user_id', data.user.id).single()
    if (tenant?.status === 'pending_payment') { window.location.href = '/onboarding/pagamento'; return }
    if (tenant?.status === 'suspended') { window.location.href = '/onboarding/suspenso'; return }
    if (tenant) {
      const { data: unidades } = await supabase.from('tenant_units').select('id').eq('tenant_id', tenant.id).eq('ativo', true)
      if (unidades && unidades.length > 1) { window.location.href = '/unidades'; return }
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F7941D] to-[#e07a0a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-3">
              <span className="text-4xl">🥕</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-wider">ALL NATURAL</h1>
            <p className="text-white/80 text-sm mt-1">Comida deliciosa e saudável</p>
            <p className="text-white/60 text-xs mt-3">Controle de Entregas</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                placeholder="seu@email.com" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{erro}</div>}
            <button type="submit" disabled={carregando}
              className="w-full bg-[#F7941D] hover:bg-[#e07a0a] disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/70 text-sm mt-5">
          Novo cliente?{' '}
          <a href="/cadastro" className="text-white font-bold underline hover:text-white/90">
            Criar conta →
          </a>
        </p>

        <p className="text-center text-white/50 text-xs mt-3">
          All Natural · Batel · Curitiba
        </p>
      </div>
    </div>
  )
}
