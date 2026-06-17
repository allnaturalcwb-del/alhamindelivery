'use client'

import { useState } from 'react'
import { formatarValor } from '@/lib/km'
import { BarChart3, Users, MapPin, FileText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const MOTOBOYS = [
  { id: '1', nome: 'Yusuf Al-Rashid', tipo: 'fixo', valor_diaria: 45 },
  { id: '2', nome: 'Karim Nasser', tipo: 'fixo', valor_diaria: 45 },
  { id: '3', nome: 'Omar Khalil', tipo: 'avulso', valor_diaria: 35 },
]

// Entregas por dia (índice 0 = hoje, 1 = ontem, 2 = anteontem, ...)
const DIAS: { label: string; entregas: { id: string; motoboy_id: string; tipo: string; endereco_destino: string; km_calculado: number; valor_km: number; hora: string }[] }[] = [
  {
    label: 'Hoje',
    entregas: [
      { id: 'e1', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Rua Mateus Leme, 320 — Centro Cívico',    km_calculado: 5,  valor_km: 8,  hora: '11:14' },
      { id: 'e2', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Av. Água Verde, 740 — Água Verde',         km_calculado: 7,  valor_km: 10, hora: '12:02' },
      { id: 'e3', motoboy_id: '1', tipo: 'fora',   endereco_destino: 'Rua Comendador Araújo, 55 — Batel',        km_calculado: 3,  valor_km: 6,  hora: '13:30' },
      { id: 'e4', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Al. Prudente de Moraes, 200 — Bigorrilho', km_calculado: 6,  valor_km: 8,  hora: '14:15' },
      { id: 'e5', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Av. Batel, 1320 — Batel',                  km_calculado: 4,  valor_km: 8,  hora: '11:40' },
      { id: 'e6', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Rua XV de Novembro, 980 — Centro',         km_calculado: 9,  valor_km: 13, hora: '12:55' },
      { id: 'e7', motoboy_id: '2', tipo: 'fora',   endereco_destino: 'Rua Doutor Muricy, 630 — Centro',          km_calculado: 8,  valor_km: 10, hora: '14:40' },
      { id: 'e8', motoboy_id: '3', tipo: 'ifood',  endereco_destino: 'Al. Dom Pedro II, 500 — Bigorrilho',       km_calculado: 7,  valor_km: 10, hora: '12:20' },
      { id: 'e9', motoboy_id: '3', tipo: 'ifood',  endereco_destino: 'Rua Padre Agostinho, 100 — Mercês',        km_calculado: 10, valor_km: 13, hora: '13:50' },
    ],
  },
  {
    label: 'Ontem',
    entregas: [
      { id: 'f1', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Rua Emiliano Perneta, 200 — Centro',       km_calculado: 6,  valor_km: 8,  hora: '11:05' },
      { id: 'f2', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Av. Iguaçu, 1500 — Rebouças',              km_calculado: 8,  valor_km: 10, hora: '12:30' },
      { id: 'f3', motoboy_id: '1', tipo: 'fora',   endereco_destino: 'Rua Marechal Deodoro, 630 — Centro',       km_calculado: 5,  valor_km: 8,  hora: '14:00' },
      { id: 'f4', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Rua Visconde do Rio Branco, 800 — Centro', km_calculado: 7,  valor_km: 10, hora: '11:50' },
      { id: 'f5', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Av. República Argentina, 400 — Novo Mundo',km_calculado: 11, valor_km: 13, hora: '13:10' },
      { id: 'f6', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Rua Amintas de Barros, 55 — Centro',       km_calculado: 4,  valor_km: 8,  hora: '14:50' },
      { id: 'f7', motoboy_id: '3', tipo: 'fora',   endereco_destino: 'Rua Cruz Machado, 120 — Centro',           km_calculado: 5,  valor_km: 8,  hora: '12:00' },
      { id: 'f8', motoboy_id: '3', tipo: 'ifood',  endereco_destino: 'Rua Francisco Torres, 700 — Centro',       km_calculado: 6,  valor_km: 8,  hora: '13:35' },
    ],
  },
  {
    label: 'Anteontem',
    entregas: [
      { id: 'g1', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Av. Cândido de Abreu, 200 — Centro Cívico',km_calculado: 7,  valor_km: 10, hora: '11:20' },
      { id: 'g2', motoboy_id: '1', tipo: 'fora',   endereco_destino: 'Rua Inácio Lustosa, 400 — São Francisco',  km_calculado: 4,  valor_km: 8,  hora: '12:45' },
      { id: 'g3', motoboy_id: '1', tipo: 'ifood',  endereco_destino: 'Av. Sete de Setembro, 3500 — Bigorrilho',  km_calculado: 9,  valor_km: 13, hora: '14:10' },
      { id: 'g4', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Rua Nilo Peçanha, 200 — Portão',           km_calculado: 12, valor_km: 16, hora: '11:35' },
      { id: 'g5', motoboy_id: '2', tipo: 'ifood',  endereco_destino: 'Av. Água Verde, 400 — Água Verde',         km_calculado: 6,  valor_km: 8,  hora: '13:00' },
      { id: 'g6', motoboy_id: '3', tipo: 'ifood',  endereco_destino: 'Rua Marechal Floriano, 300 — Centro',      km_calculado: 5,  valor_km: 8,  hora: '11:50' },
      { id: 'g7', motoboy_id: '3', tipo: 'fora',   endereco_destino: 'Rua Comendador Macedo, 800 — Centro',      km_calculado: 3,  valor_km: 6,  hora: '13:20' },
      { id: 'g8', motoboy_id: '3', tipo: 'ifood',  endereco_destino: 'Al. Augusto Stellfeld, 100 — Batel',       km_calculado: 6,  valor_km: 8,  hora: '15:00' },
    ],
  },
]

// Dados do relatório semanal por motoboy
const RELATORIO = [
  { motoboy_id: '1', entregas: 31, dias: 5, corridas: 256, diarias: 45 * 5 },
  { motoboy_id: '2', entregas: 28, dias: 5, corridas: 234, diarias: 45 * 5 },
  { motoboy_id: '3', entregas: 22, dias: 4, corridas: 180, diarias: 35 * 4 },
]

export default function DemoClient() {
  const [aba, setAba] = useState<'entregas' | 'historico' | 'relatorio' | 'motoboys'>('entregas')
  const [diaIdx, setDiaIdx] = useState(0)

  const diaAtual = DIAS[diaIdx]
  const entregasHoje = DIAS[0].entregas
  const totalCorridas = entregasHoje.reduce((s, e) => s + e.valor_km, 0)
  const totalKm = entregasHoje.reduce((s, e) => s + e.km_calculado, 0)

  const porMotoboy = MOTOBOYS.map(m => {
    const ents = diaAtual.entregas.filter(e => e.motoboy_id === m.id)
    return {
      ...m,
      entregas: ents,
      totalKm: ents.reduce((s, e) => s + e.km_calculado, 0),
      totalValor: ents.reduce((s, e) => s + e.valor_km, 0),
    }
  })

  const totalRelatorio = RELATORIO.reduce((s, r) => s + r.corridas + r.diarias, 0)
  const totalEntregasRel = RELATORIO.reduce((s, r) => s + r.entregas, 0)

  return (
    <div className="min-h-screen bg-[#F5F0E6]">

      {/* Banner demo */}
      <div className="bg-[#1C1C1C] border-b-2 border-[#2B6344] px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
        <span className="text-[#2B6344] text-xs font-bold uppercase tracking-widest">🎯 Modo Demonstração</span>
        <span className="text-gray-400 text-xs">— dados fictícios para apresentação —</span>
        <a href="https://wa.me/5541996412444?text=Quero%20conhecer%20o%20sistema%20de%20delivery!"
          target="_blank" rel="noopener noreferrer"
          className="ml-2 bg-[#2B6344] text-white text-xs font-bold px-3 py-1 rounded-full hover:bg-[#1e4d31] transition-colors">
          Quero contratar →
        </a>
      </div>

      {/* Header */}
      <header className="bg-[#1C1C1C] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-alhamin.svg" alt="Al'hamin" className="w-8 h-8 rounded-lg" />
          <div>
            <div className="font-bold text-sm leading-tight">AL&apos;HAMIN</div>
            <div className="text-gray-400 text-xs">Admin · Demo</div>
          </div>
        </div>
        <div className="text-xs text-[#2B6344] font-semibold border border-[#2B6344] px-2 py-1 rounded-full">DEMO</div>
      </header>

      {/* Stats — sempre mostram hoje */}
      <div className="bg-[#1C1C1C] px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-400">Entregas hoje</p>
            <p className="text-2xl font-bold">{entregasHoje.length}</p>
            <p className="text-xs text-gray-500">{totalKm} km total</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-400">Custo do dia</p>
            <p className="text-2xl font-bold text-[#EDD9A3]">{formatarValor(totalCorridas + 125)}</p>
            <p className="text-xs text-gray-500">corridas + diárias</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 shadow-sm overflow-x-auto">
        {[
          { key: 'entregas',  icon: <RefreshCw size={13} />,  label: 'Hoje' },
          { key: 'historico', icon: <ChevronLeft size={13} />, label: 'Histórico' },
          { key: 'relatorio', icon: <FileText size={13} />,   label: 'Relatório' },
          { key: 'motoboys',  icon: <Users size={13} />,      label: 'Motoboys' },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setAba(tab.key as typeof aba); setDiaIdx(0) }}
            className={`flex-1 px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors ${aba === tab.key ? 'border-[#2B6344] text-[#2B6344]' : 'border-transparent text-gray-400'}`}>
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
              <span className="flex items-center gap-1 text-xs text-gray-400"><RefreshCw size={12} /> Ao vivo</span>
            </div>
            {MOTOBOYS.map(m => {
              const ents = entregasHoje.filter(e => e.motoboy_id === m.id)
              const totalV = ents.reduce((s, e) => s + e.valor_km, 0)
              const totalK = ents.reduce((s, e) => s + e.km_calculado, 0)
              return (
                <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">🛵 {m.nome}</p>
                      <p className="text-xs text-gray-400">{m.tipo} · {ents.length} entregas · {totalK} km</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#2B6344]">{formatarValor(totalV + m.valor_diaria)}</p>
                      <p className="text-xs text-gray-400">diária + corridas</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {ents.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2 py-1.5">
                        <span className="text-gray-500 truncate flex-1 mr-2">{e.tipo === 'ifood' ? '🛍️' : '📦'} {e.endereco_destino}</span>
                        <span className="text-gray-700 font-medium shrink-0">{e.km_calculado}km · {formatarValor(e.valor_km)} · {e.hora}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ABA HISTÓRICO — navegação por dia */}
        {aba === 'historico' && (
          <div className="space-y-3">
            {/* Seletor de dia */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
              <button onClick={() => setDiaIdx(i => Math.min(i + 1, DIAS.length - 1))}
                disabled={diaIdx === DIAS.length - 1}
                className="p-1 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors">
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <div className="text-center">
                <p className="font-bold text-gray-800">{diaAtual.label}</p>
                <p className="text-xs text-gray-400">{diaAtual.entregas.length} entregas</p>
              </div>
              <button onClick={() => setDiaIdx(i => Math.max(i - 1, 0))}
                disabled={diaIdx === 0}
                className="p-1 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors">
                <ChevronRight size={18} className="text-gray-600" />
              </button>
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
                  <p className="text-xs text-gray-400 italic">Sem entregas neste dia</p>
                ) : (
                  <div className="space-y-1.5">
                    {m.entregas.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2 py-1.5">
                        <span className="text-gray-500 truncate flex-1 mr-2">{e.tipo === 'ifood' ? '🛍️' : '📦'} {e.endereco_destino}</span>
                        <span className="text-gray-700 font-medium shrink-0">{e.km_calculado}km · {formatarValor(e.valor_km)} · {e.hora}</span>
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
              <p className="font-bold text-gray-800 mb-1">Semana atual</p>
              <p className="text-xs text-gray-400 mb-3">09/06 – 15/06</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#F5F0E6] rounded-xl p-2">
                  <p className="text-gray-500">Entregas</p>
                  <p className="font-bold text-lg text-[#2B6344]">{totalEntregasRel}</p>
                </div>
                <div className="bg-[#F5F0E6] rounded-xl p-2">
                  <p className="text-gray-500">Dias</p>
                  <p className="font-bold text-lg text-[#2B6344]">5</p>
                </div>
                <div className="bg-[#F5F0E6] rounded-xl p-2">
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold text-base text-[#2B6344]">{formatarValor(totalRelatorio)}</p>
                </div>
              </div>
            </div>
            {RELATORIO.map(r => {
              const m = MOTOBOYS.find(mb => mb.id === r.motoboy_id)!
              return (
                <div key={r.motoboy_id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">🛵 {m.nome}</p>
                      <p className="text-xs text-gray-400">{r.entregas} entregas · {r.dias} dias · {m.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#2B6344]">{formatarValor(r.corridas + r.diarias)}</p>
                      <p className="text-xs text-gray-400">a pagar</p>
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-gray-50 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Corridas ({r.entregas}x)</span>
                      <span className="font-medium">{formatarValor(r.corridas)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Diárias ({r.dias}x × {formatarValor(m.valor_diaria)})</span>
                      <span className="font-medium">{formatarValor(r.diarias)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ABA MOTOBOYS */}
        {aba === 'motoboys' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ativos hoje ✅</p>
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

        {/* CTA */}
        <div className="mt-8 bg-[#1C1C1C] rounded-2xl p-5 text-center">
          <p className="text-white font-bold text-base mb-1">Quer isso no seu restaurante?</p>
          <p className="text-gray-400 text-xs mb-4">Sistema completo · Implantação inclusa · Suporte direto</p>
          <a href="https://wa.me/5541996412444?text=Quero%20conhecer%20o%20sistema%20de%20delivery!"
            target="_blank" rel="noopener noreferrer"
            className="block bg-[#2B6344] text-[#EDD9A3] font-bold py-3 rounded-xl text-sm hover:bg-[#1e4d31] transition-colors">
            Falar com o Kaue no WhatsApp →
          </a>
        </div>

      </div>
    </div>
  )
}
