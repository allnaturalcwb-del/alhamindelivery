'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTurnoInfo, getDataBrasilia, type Turno } from '@/lib/turno'

type Profile = { id: string; nome: string; tipo: string }

const CORES_CARD = [
  'from-orange-400 to-orange-600',
  'from-amber-400 to-amber-600',
  'from-red-400 to-red-600',
  'from-green-400 to-green-600',
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
]

interface Props {
  motoboysIniciais: Profile[]
}

export default function QuiosqueSelecaoClient({ motoboysIniciais }: Props) {
  const turno = getTurnoInfo()
  const dataHoje = getDataBrasilia()

  // null = ainda não sabemos se a escala do turno atual já foi definida hoje
  const [escalaAtual, setEscalaAtual] = useState<Record<string, boolean> | null>(null)
  const [definindoEscala, setDefinindoEscala] = useState(false)
  const [escalaTemp, setEscalaTemp] = useState<Record<string, boolean>>({})
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch(`/api/quiosque/escala?data=${dataHoje}&turno=${turno.turno}`)
      .then(r => r.json())
      .then((rows: { motoboy_id: string; ativo: boolean }[]) => {
        if (!rows || rows.length === 0) {
          const inicial: Record<string, boolean> = {}
          motoboysIniciais.forEach(m => { inicial[m.id] = true })
          setEscalaTemp(inicial)
          setDefinindoEscala(true)
        } else {
          const mapa: Record<string, boolean> = {}
          rows.forEach(r => { mapa[r.motoboy_id] = r.ativo })
          setEscalaAtual(mapa)
        }
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvarEscala(turnoParaSalvar: Turno) {
    setSalvando(true)
    const escalas = motoboysIniciais.map(m => ({ motoboy_id: m.id, ativo: !!escalaTemp[m.id] }))
    await fetch('/api/quiosque/escala', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataHoje, turno: turnoParaSalvar, escalas }),
    })
    setEscalaAtual(escalaTemp)
    setDefinindoEscala(false)
    setSalvando(false)
  }

  function abrirEdicaoEscala() {
    const inicial: Record<string, boolean> = {}
    motoboysIniciais.forEach(m => { inicial[m.id] = escalaAtual?.[m.id] !== false })
    setEscalaTemp(inicial)
    setDefinindoEscala(true)
  }

  // TELA: definir escala do turno (manhã, ao abrir antes de qualquer entrega; ou noite, no corte das 16h)
  if (!carregando && definindoEscala) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] flex flex-col p-6">
        <div className="text-center mb-6 pt-4">
          <div className="text-5xl mb-2">{turno.emoji}</div>
          <h1 className="text-2xl font-black text-white">Escala da {turno.label.toLowerCase()}</h1>
          <p className="text-white/60 text-sm mt-1">
            Marque quem vai trabalhar no turno da {turno.label.toLowerCase()}
            {turno.turno === 'noite' ? ' (até 23h59)' : ''}
          </p>
        </div>
        <div className="flex-1 space-y-2 max-w-md mx-auto w-full overflow-y-auto">
          {motoboysIniciais.map(m => (
            <label
              key={m.id}
              className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3 cursor-pointer active:bg-white/20"
            >
              <div>
                <span className="text-white font-semibold block">{m.nome}</span>
                <span className="text-white/50 text-xs">{m.tipo === 'fixo' ? 'Fixo' : 'Avulso'}</span>
              </div>
              <input
                type="checkbox"
                checked={!!escalaTemp[m.id]}
                onChange={e => setEscalaTemp(prev => ({ ...prev, [m.id]: e.target.checked }))}
                className="w-7 h-7 accent-[#2B6344]"
              />
            </label>
          ))}
          {motoboysIniciais.length === 0 && (
            <p className="text-white/50 text-center py-8">Nenhum motoboy cadastrado</p>
          )}
        </div>
        <button
          onClick={() => salvarEscala(turno.turno)}
          disabled={salvando}
          className="mt-6 w-full bg-[#2B6344] text-[#EDD9A3] font-black text-lg py-4 rounded-2xl shadow-xl active:scale-95 transition-transform max-w-md mx-auto disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : `Confirmar escala da ${turno.label.toLowerCase()} ✅`}
        </button>
      </div>
    )
  }

  const motoboysExibir = motoboysIniciais.filter(m => escalaAtual?.[m.id] !== false)

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#2B6344] flex items-center justify-center">
        <p className="text-[#EDD9A3] text-lg font-semibold">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2B6344] flex flex-col">
      {/* Header */}
      <div className="pt-10 pb-6 px-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 bg-[#2B6344] border-2 border-[#EDD9A3]/30 rounded-2xl flex items-center justify-center shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-alhamin.png" alt="Al'hamin" className="w-18 h-18 object-contain" />
          </div>
        </div>
        <p className="text-[#EDD9A3]/70 mt-1 text-base">Culinária árabe autêntica</p>
        <div className="flex justify-center mt-3">
          <div className="bg-black/25 text-white text-sm font-bold px-4 py-2 rounded-full shadow-md flex items-center gap-1.5">
            <span className="text-base">{turno.emoji}</span> Turno {turno.label}
          </div>
        </div>
      </div>

      {/* Instrução */}
      <div className="text-center mb-6">
        <p className="text-white/90 text-xl font-semibold">Quem vai entregar? 🛵</p>
        <p className="text-white/60 text-sm mt-1">Toque no seu nome para começar</p>
      </div>

      <div className="text-center mb-4">
        <button onClick={abrirEdicaoEscala} className="text-[#EDD9A3]/60 text-xs underline">
          Editar escala da {turno.label.toLowerCase()}
        </button>
      </div>

      {/* Grid de motoboys */}
      <div className="flex-1 px-6 pb-8">
        <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
          {motoboysExibir.map((m, i) => (
            <Link
              key={m.id}
              href={`/quiosque/${m.id}`}
              className="group"
            >
              <div className={`bg-gradient-to-br ${CORES_CARD[i % CORES_CARD.length]} rounded-3xl p-6 text-center shadow-xl active:scale-95 transition-transform duration-150 border-4 border-white/20`}>
                <div className="text-5xl mb-3">🛵</div>
                <div className="text-2xl font-black text-white drop-shadow">
                  {m.nome.split(' ')[0]}
                </div>
                <div className="text-white/70 text-xs mt-1 font-medium uppercase tracking-wide">
                  {m.tipo === 'fixo' ? 'Fixo' : 'Avulso'}
                </div>
              </div>
            </Link>
          ))}

          {motoboysExibir.length === 0 && (
            <div className="col-span-2 bg-white/10 rounded-3xl p-8 text-center">
              <p className="text-[#EDD9A3] text-lg">Nenhum motoboy escalado para a {turno.label.toLowerCase()}</p>
              <p className="text-[#EDD9A3]/60 text-sm mt-1">Toque em &quot;Editar escala da {turno.label.toLowerCase()}&quot; acima</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <Link href="/login" className="text-[#EDD9A3]/30 text-xs">Admin</Link>
      </div>
    </div>
  )
}
