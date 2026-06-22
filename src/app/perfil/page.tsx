'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import tenant from '@/lib/tenant'

export default function PerfilPage() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso(false)

    if (novaSenha !== confirmar) { setErro('As senhas não conferem.'); return }
    if (novaSenha.length < 6) { setErro('A nova senha precisa ter pelo menos 6 caracteres.'); return }
    if (novaSenha === senhaAtual) { setErro('A nova senha deve ser diferente da atual.'); return }

    setLoading(true)

    // Reautentica com a senha atual para verificar
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setErro('Sessão expirada. Faça login novamente.'); setLoading(false); return }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: senhaAtual,
    })
    if (loginError) {
      setErro('Senha atual incorreta.')
      setLoading(false)
      return
    }

    // Atualiza para a nova senha
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      setErro(error.message)
    } else {
      setSucesso(true)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmar('')
    }
    setLoading(false)
  }

  const cor = tenant.corPrimaria

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 transition text-sm flex items-center gap-1">
            ← Voltar
          </button>
          <h1 className="text-base font-bold text-gray-700">Meu perfil</h1>
          <div className="w-12" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">🔐 Trocar senha</h2>
          <p className="text-gray-400 text-sm mb-5">Preencha os campos para definir uma nova senha.</p>

          {sucesso && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
              ✅ Senha alterada com sucesso!
            </div>
          )}

          <form onSubmit={trocarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-gray-50"
                style={{ ['--tw-ring-color' as string]: cor }}
                placeholder="Sua senha atual"
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-gray-50"
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-gray-50"
                placeholder="Repita a nova senha"
                required
                autoComplete="new-password"
              />
            </div>

            {erro && (
              <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{erro}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              style={{ backgroundColor: cor }}
            >
              {loading ? 'Salvando...' : '✓ Salvar nova senha'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-4">
          Esqueceu a senha atual?{' '}
          <a href="/recuperar-senha" className="underline hover:text-gray-600" style={{ color: cor }}>
            Recuperar por e-mail
          </a>
        </p>
      </div>
    </div>
  )
}
