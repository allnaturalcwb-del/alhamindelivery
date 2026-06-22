'use client'

import { useState } from 'react'

interface TenantConfig {
  nome_display: string
  cor_primaria: string
  emoji: string
}

interface TenantUnit {
  id: string
  nome: string
  endereco: string | null
  cidade: string | null
  vercel_url: string | null
}

interface Props {
  tenant: { nome_empresa: string }
  config: TenantConfig | null
  unidades: TenantUnit[]
}

export default function UnidadesClient({ tenant, config, unidades }: Props) {
  const [selecionando, setSelecionando] = useState<string | null>(null)

  const cor = config?.cor_primaria || '#F7941D'
  const nome = config?.nome_display || tenant.nome_empresa
  const emoji = config?.emoji || '🛵'

  function entrar(unidade: TenantUnit) {
    setSelecionando(unidade.id)

    // Salva a unidade escolhida no sessionStorage
    sessionStorage.setItem('unit_id', unidade.id)
    sessionStorage.setItem('unit_nome', unidade.nome)

    // Se a unidade tem URL própria (ex: allhaminfazendinha.vercel.app), redireciona pra lá
    if (unidade.vercel_url) {
      window.location.href = `https://${unidade.vercel_url}/dashboard`
    } else {
      window.location.href = `/dashboard?unit=${unidade.id}`
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${cor}22 0%, ${cor}11 100%)` }}
    >
      <div className="w-full max-w-md">
        {/* Header da marca */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-3 text-4xl"
            style={{ background: cor }}
          >
            {emoji}
          </div>
          <h1 className="text-2xl font-black text-gray-800">{nome}</h1>
          <p className="text-gray-500 text-sm mt-1">Selecione a unidade</p>
        </div>

        {/* Cards de unidade */}
        <div className="space-y-3">
          {unidades.map((u) => (
            <button
              key={u.id}
              onClick={() => entrar(u)}
              disabled={selecionando !== null}
              className="w-full bg-white rounded-2xl shadow-md p-5 text-left hover:shadow-lg transition-all border-2 border-transparent disabled:opacity-60"
              style={selecionando === u.id ? { borderColor: cor } : {}}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-base">{u.nome}</p>
                  {u.endereco && (
                    <p className="text-gray-400 text-sm mt-0.5">
                      📍 {u.endereco}{u.cidade ? `, ${u.cidade}` : ''}
                    </p>
                  )}
                  {u.vercel_url && (
                    <p className="text-gray-300 text-xs mt-1">{u.vercel_url}</p>
                  )}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 ml-4"
                  style={{ background: selecionando === u.id ? cor : '#e5e7eb' }}
                >
                  {selecionando === u.id ? '✓' : '→'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Aviso login único */}
        <div className="mt-6 bg-white/70 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400">
            🔑 O mesmo login e senha funcionam em todas as unidades
          </p>
        </div>

        {/* Link para sair */}
        <div className="text-center mt-4">
          <a
            href="/api/auth/signout"
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Sair
          </a>
        </div>
      </div>
    </div>
  )
}
