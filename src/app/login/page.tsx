'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('Email ou senha incorretos.'); setCarregando(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    router.push(profile?.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2B6344] to-[#1e4d31] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <div className="w-28 h-28 bg-[#2B6344] border-4 border-[#EDD9A3]/40 rounded-2xl shadow-lg flex items-center justify-center mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-alhamin.png" alt="Al'hamin" className="w-24 h-24 object-contain rounded-xl" />
            </div>
            <p className="text-[#EDD9A3]/80 text-sm mt-1">Culinária árabe autêntica</p>
            <p className="text-[#EDD9A3]/60 text-xs mt-3">Controle de Entregas</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                placeholder="seu@email.com" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{erro}</div>}
            <button type="submit" disabled={carregando}
              className="w-full bg-[#2B6344] hover:bg-[#1e4d31] disabled:bg-[#2B6344]/50 text-[#EDD9A3] font-bold py-3 rounded-xl transition-colors shadow-md">
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#EDD9A3]/40 text-xs mt-6">
          Al&apos;hamin · Curitiba
        </p>
      </div>
    </div>
  )
}
