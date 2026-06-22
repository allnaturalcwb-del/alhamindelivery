'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const supabase = createClient()

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha !== confirmar) {
      setErro('As senhas não conferem.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        // Após confirmar e-mail, redireciona para pagamento
        emailRedirectTo: `${window.location.origin}/onboarding/pagamento`,
      },
    })

    if (error) {
      setErro(
        error.message.includes('already registered')
          ? 'Este e-mail já está cadastrado. Faça login.'
          : error.message
      )
      setCarregando(false)
      return
    }

    // Redireciona direto para pagamento (Supabase já cria a sessão no sandbox)
    window.location.href = '/onboarding/pagamento'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-500 to-orange-600 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-3">
              <span className="text-4xl">🛵</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-wider">ROTA SIMPLES</h1>
            <p className="text-white/80 text-sm mt-1">Controle de entregas para restaurantes</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Criar conta</h2>
          <p className="text-sm text-gray-400 mb-5">
            Após o cadastro, você vai ativar seu plano.
          </p>

          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                placeholder="Repita a senha"
                required
                autoComplete="new-password"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
            >
              {carregando ? 'Criando conta...' : 'Criar conta e ativar plano →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-5">
            Já tem conta?{' '}
            <a href="/login" className="text-orange-500 font-semibold hover:underline">
              Entrar
            </a>
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          Rota Simples · Desenvolvido por Kauê Drabik
        </p>
      </div>
    </div>
  )
}
