'use client'

import { useState } from 'react'
import { formatarValor } from '@/lib/km'
import { BarChart3, Users, MapPin, FileText, Calendar, RefreshCw } from 'lucide-react'

const MOTOBOYS = [
  { id: '1', nome: 'Marcos Silva', tipo: 'fixo', valor_diaria: 40 },
  { id: '2', nome: 'Felipe Costa', tipo: 'fixo', valor_diaria: 40 },
  { id: '3', nome: 'Lucas Andrade', tipo: 'avulso', valor_diaria: 30 },
]

const ENTREGAS = [
  { id: 'e1', motoboy_id: '1', motoboy_nome: 'Marcos Silva', tipo: 'ifood', endereco_destino: 'Rua XV de Novembro, 420 — Centro', km_calculado: 5, valor_km: 8, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'e2', motoboy_id: '1', motoboy_nome: 'Marcos Silva', tipo: 'ifood', endereco_destino: 'Av. Água Verde, 1200 — Água Verde', km_calculado: 7, valor_km: 10, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'e3', motoboy_id: '1', motoboy_nome: 'Marcos Silva', tipo: 'fora', endereco_destino: 'Rua Comendador Araújo, 100 — Batel', km_calculado: 3, valor_km: 6, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'e4', motoboy_id: '2', motoboy_nome: 'Felipe Costa', tipo: 'ifood', endereco_destino: 'Av. Batel, 1320 — Batel', km_calculado: 5, valor_km: 8, created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'e5', motoboy_id: '2', motoboy_nome: 'Felipe Costa', tipo: 'ifood', endereco_destino: 'Rua Mateus Leme, 800 — Centro Cívico', km_calculado: 10, valor_km: 13, created_at: new Date(Date.now() - 3600000 * 1.5).toISOString() },
  { id: 'e6', motoboy_id: '3', motoboy_nome: 'Lucas Andrade', tipo: 'fora', endereco_destino: 'Al. Dom Pedro II, 500 — Bigorrilho', km_calculado: 7, valor_km: 10, created_at: new Date(Date.now() - 3600000 * 2.5).toISOString() },
]

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}

export default function DemoClient() {
  const [aba, setAba] = useState<'entregas' | 'relatorio' | 'motoboys' | 'enderecos'>('entregas')

  const totalCorridas = ENTREGAS.reduce((s, e) => s + e.valor_km, 0)
  const totalKm = ENTREGAS.reduce((s, e) => s + (e.km_calculado || 0), 0)

  const porMotoboy = MOTOBOYS.map(m => {
    const ents = ENTREGAS.filter(e => e.motoboy_id === m.id)
    return {
      ...m,
      entregas: ents,
      totalKm: ents.reduce((s, e) => s + (e.km_calculado || 0), 0),
      totalValor: ents.reduce((s, e) => s + e.valor_km, 0),
    }
  })

  return (
    <div className="min-h-screen bg-[#F5F0E6]">

      {/* Banner demo */}
      <div className="bg-[#1C1C1C] border-b-2 border-[#2B6344] px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-[#2B6344] text-xs font-bold uppercase tracking-widest">🎯 Modo Demonstração</span>
        <span className="text-gray-400 text-xs">— dados fictícios para apresentação —</span>
        <a href="https://wa.me/5541996412444?text=Quero%20conhecer%20o%20RotaF%C3%A1cil!"
          target="_blank" rel="noopener noreferrer"
          className="ml-4 bg-[#2B6344] text-white text-xs font-bold px-3 py-1 rounded-full hover:bg-[#1e4d31] transition-colors">
          Quero contratar →
        </a>
      </div>

      {/* Header */}
      <header className="bg-[#1C1C1C] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-alhamin.svg" alt="Al'hamin" className="w-8 h-8 rounded-lg" />
          <div>
            <div className="font-bold text-sm leading-tight">AL'HAMIN</div>
            <div className="text-gray-400 text-xs">Admin · Demo</div>
          </div>
        </div>
        <div className="text-xs text-[#2B6344] font-semibold border border-[#2B6344] px-2 py-1 rounded-full">DEMO</div>
      </header>

      {/* Stats */}
      <div className="bg-[#1C1C1C] px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-400">Entregas hoje</p>
            <p className="text-2xl font-bold">{ENTREGAS.length}</p>
            <p className="text-xs text-gray-500">{totalKm} km total</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-400">Custo do dia</p>
            <p className="text-2xl font-bold text-[#2B6344]">{formatarValor(totalCorridas + 110)}</p>
            <p className="text-xs text-gray-500">corridas + diárias</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 shadow-sm overflow-x-auto">
        {[
          { key: 'entregas', icon: <BarChart3 size={13} />, label: 'Hoje' },
          { key: 'relatorio', icon: <FileText size={13} />, label: 'Relatório' },
          { key: 'motoboys', icon: <Users size={13} />, label: 'Motoboys' },
          { key: 'enderecos', icon: <MapPin size={13} />, label: 'Endereços' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setAba(tab.key as typeof aba)}
            className={`flex-shrink-0 px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors ${aba === tab.key ? 'border-[#2B6344] text-[#2B6344]' : 'border-transparent text-gray-400'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">

        {/* ABA HOJE */}
        {aba === 'entregas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Entregas de hoje</h2>
              <span className="flex items-center gap-1 text-sm text-gray-400"><RefreshCw size={14} /> Ao vivo</span>
            </div>
            {porMotoboy.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">🛵 {m.nome}</p>
                    <p className="text-xs text-gray-400">{m.tipo} · {m.entregas.length} entregas · {m.totalKm} km</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#2B6344]">{formatarValor(m.totalValor + m.valor_diaria)}</p>
                    <p className="text-xs text-gray-400">diária + corridas</p>
                  </div>
                </div>
                {m.entregas.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma entrega ainda</p>
                ) : (
                  <div className="space-y-1">
                    {m.entregas.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 truncate flex-1 mr-2">{e.tipo === 'ifood' ? '🛍️' : '📦'} {e.endereco_destino}</span>
                        <span className="text-gray-700 font-medium shrink-0">{e.km_calculado}km · {formatarValor(e.valor_km)} · {formatarHora(e.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ABA RELATÓRIO */}
        {aba === 'relatorio' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">Semana atual</p>
                  <p className="text-xs text-gray-400">09/06 – 15/06</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-green-50 rounded-xl p-2">
                  <p className="text-gray-500">Entregas</p>
                  <p className="font-bold text-lg text-[#2B6344]">38</p>
                </div>
                <div className="bg-green-50 rounded-xl p-2">
                  <p className="text-gray-500">Dias</p>
                  <p className="font-bold text-lg text-[#2B6344]">5</p>
                </div>
                <div className="bg-green-50 rounded-xl p-2">
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold text-lg text-[#2B6344]">R$842</p>
                </div>
              </div>
            </div>
            {MOTOBOYS.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">🛵 {m.nome}</p>
                    <p className="text-xs text-gray-400">14 entregas · 5 dias · {m.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#2B6344]">{formatarValor(m.valor_diaria * 5 + 112)}</p>
                    <p className="text-xs text-gray-400">a pagar</p>
                  </div>
                </div>
                <div className="space-y-1 border-t border-gray-50 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Corridas (14x)</span>
                    <span className="font-medium">{formatarValor(112)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Diárias (5x × {formatarValor(m.valor_diaria)})</span>
                    <span className="font-medium">{formatarValor(m.valor_diaria * 5)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA MOTOBOYS */}
        {aba === 'motoboys' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ativos ✅</p>
            {MOTOBOYS.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">🛵 {m.nome}</p>
                  <p className="text-xs text-gray-400">{m.tipo} · {formatarValor(m.valor_diaria)}/dia</p>
                </div>
                <button className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-xl font-semibold">
                  Pausar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ABA ENDEREÇOS */}
        {aba === 'enderecos' && (
          <div className="space-y-3">
            {[
              { nome: 'Cozinha Central', end: 'Rua XV de Novembro, 100 — Centro' },
              { nome: 'Shopping Mueller', end: 'Rua Cândido Lopes, 82 — Centro' },
              { nome: 'Pátio Batel', end: 'Av. do Batel, 1868 — Batel' },
            ].map((e, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-semibold text-gray-800">{e.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{e.end}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA fixo no fundo */}
        <div className="mt-8 bg-[#1C1C1C] rounded-2xl p-5 text-center">
          <p className="text-white font-bold text-base mb-1">Quer isso no seu restaurante?</p>
          <p className="text-gray-400 text-xs mb-4">Planos a partir de R$ 149/mês · Implantação inclusa</p>
          <a href="https://wa.me/5541996412444?text=Quero%20conhecer%20o%20RotaF%C3%A1cil!"
            target="_blank" rel="noopener noreferrer"
            className="block bg-[#2B6344] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1e4d31] transition-colors">
            Falar com o Kaue no WhatsApp →
          </a>
        </div>

      </div>
    </div>
  )
}
