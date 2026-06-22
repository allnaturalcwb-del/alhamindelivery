'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Etapa = 'email' | 'codigo' | 'nova-senha' | 'sucesso'

export default function RecuperarSenhaPage() {
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Etapa 1 — envia OTP de 6 dígitos para o email
  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) {
      setErro(error.message.includes('not found')
        ? 'E-mail não encontrado. Verifique ou fale com o administrador.'
        : error.message)
    } else {
      setEtapa('codigo')
    }
    setLoading(false)
  }

  // Etapa 2 — verifica o código de 6 dígitos
  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })
    if (error) {
      setErro('Código inválido ou expirado. Tente novamente.')
    } else {
      setEtapa('nova-senha')
    }
    setLoading(false)
  }

  // Etapa 3 — define nova senha
  async function definirSenha(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (novaSenha !== confirmar) { setErro('As senhas não conferem.'); return }
    if (novaSenha.length < 6) { setErro('Mínimo 6 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      setErro(error.message)
    } else {
      setEtapa('sucesso')
    }
    setLoading(false)
  }

  const whatsappAdmin = 'https://wa.me/5541996412444?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20para%20recuperar%20minha%20senha%20do%20sistema.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-500 to-orange-600 px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white">🔑 Recuperar acesso</h1>
          <p className="text-white/70 text-sm mt-1">
            {etapa === 'email' && 'Informe seu e-mail cadastrado'}
            {etapa === 'codigo' && `Código enviado para ${email}`}
            {etapa === 'nova-senha' && 'Defina sua nova senha'}
            {etapa === 'sucesso' && 'Senha redefinida com sucesso!'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">

          {/* Indicador de etapas */}
          {etapa !== 'sucesso' && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {(['email', 'codigo', 'nova-senha'] as Etapa[]).map((e, i) => (
                <div key={e} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${etapa === e ? 'bg-orange-500 text-white' :
                      ['email', 'codigo', 'nova-senha'].indexOf(etapa) > i
                        ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {['email', 'codigo', 'nova-senha'].indexOf(etapa) > i ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div className={`w-6 h-0.5 ${['email', 'codigo', 'nova-senha'].indexOf(etapa) > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Etapa 1: Email */}
          {etapa === 'email' && (
            <form onSubmit={enviarCodigo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu e-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                  placeholder="seu@email.com" required autoFocus />
              </div>
              {erro && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{erro}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'Enviando...' : 'Enviar código →'}
              </button>
            </form>
          )}

          {/* Etapa 2: Código */}
          {etapa === 'codigo' && (
            <form onSubmit={verificarCodigo} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 mb-2">
                <p className="font-semibold mb-1">📧 Verifique seu e-mail</p>
                <p>Enviamos um código de 6 dígitos para <strong>{email}</strong>. Pode demorar até 2 minutos.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de 6 dígitos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                  placeholder="000000"
                  required autoFocus />
              </div>
              {erro && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{erro}</p>}
              <button type="submit" disabled={loading || codigo.length < 6}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'Verificando...' : 'Confirmar código →'}
              </button>
              <button type="button" onClick={() => setEtapa('email')}
                className="w-full text-gray-400 text-sm hover:text-gray-600 transition">
                ← Usar outro e-mail
              </button>

              {/* Fallback WhatsApp */}
              <div className="border-t border-gray-100 pt-4 text-center">
                <p className="text-xs text-gray-400 mb-2">Não recebeu o código?</p>
                <a href={whatsappAdmin} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-600 font-semibold text-sm hover:underline">
                  💬 Falar com o admin no WhatsApp
                </a>
              </div>
            </form>
          )}

          {/* Etapa 3: Nova senha */}
          {etapa === 'nova-senha' && (
            <form onSubmit={definirSenha} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                  placeholder="Mínimo 6 caracteres" required autoFocus autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                  placeholder="Repita a senha" required autoComplete="new-password" />
              </div>
              {erro && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{erro}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'Salvando...' : '✓ Salvar nova senha'}
              </button>
            </form>
          )}

          {/* Sucesso */}
          {etapa === 'sucesso' && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-lg font-bold text-gray-800">Senha redefinida!</h2>
              <p className="text-gray-500 text-sm">Use sua nova senha para entrar normalmente.</p>
              <a href="/login"
                className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition">
                Ir para o login →
              </a>
            </div>
          )}
        </div>

        {etapa === 'email' && (
          <p className="text-center text-white/70 text-sm mt-5">
            Lembrou a senha?{' '}
            <a href="/login" className="text-white font-bold hover:underline">Entrar →</a>
          </p>
        )}
      </div>
    </div>
  )
}
