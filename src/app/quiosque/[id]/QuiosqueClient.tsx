'use client'

import { useState, useEffect, useCallback } from 'react'
import { calcularValorPorKm, formatarValor } from '@/lib/km'
import AutocompleteInput from '@/components/AutocompleteInput'
import { useRouter } from 'next/navigation'
import { Send, ArrowLeft, Package, TrendingUp, Plus } from 'lucide-react'
import { getTurnoInfo, getTurno } from '@/lib/turno'

const DIARIA_MANHA_FIXO = 45
const DIARIA_MANHA_AVULSO = 35
const DIARIA_NOITE = 45

type Profile = { id: string; nome: string; tipo: string; role: string; valor_diaria: number }
type Entrega = { id: string; tipo: string; codigo_ifood: string | null; endereco_destino: string; km_calculado: number | null; valor_km: number; created_at: string; enviado_go?: boolean }
type EnderecoFav = { id: string; nome: string; endereco_completo: string }

interface Props {
  profile: Profile
  entregasIniciais: Entrega[]
  enderecosFavoritos: EnderecoFav[]
}

function formatarHora(utcString: string) {
  return new Date(utcString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}

function gerarMensagem(nome: string, entregas: Entrega[]): string {
  const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
  const ifood = entregas.filter(e => e.tipo === 'ifood' && e.codigo_ifood)
  const porFora = entregas.filter(e => e.tipo === 'por_fora')
  const total = entregas.length

  if (total === 0) return `🛵 *${nome}* saiu para entrega! ✅`

  const linhas: string[] = []
  let idx = 0

  if (ifood.length > 0) {
    if (porFora.length > 0) linhas.push('*📱 iFood:*')
    ifood.forEach(e => {
      linhas.push(`${nums[idx] || `${idx + 1}.`} ${e.codigo_ifood}`)
      idx++
    })
  }

  if (porFora.length > 0) {
    if (ifood.length > 0) linhas.push('*🏠 Por fora:*')
    porFora.forEach(e => {
      linhas.push(`${nums[idx] || `${idx + 1}.`} ${e.endereco_destino}`)
      idx++
    })
  }

  const rodape = ifood.length > 0 ? '\nDespachar no iFood! ✅' : '\n✅'
  return `🛵 *${nome}* saiu com *${total} ${total === 1 ? 'pedido' : 'pedidos'}*:\n${linhas.join('\n')}${rodape}`
}

function getMinutosBRT(): number {
  const agora = new Date()
  const hora = parseInt(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }))
  const min = parseInt(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', minute: 'numeric' }))
  return hora * 60 + min
}

export default function QuiosqueClient({ profile, entregasIniciais, enderecosFavoritos }: Props) {
  const [entregas, setEntregas] = useState<Entrega[]>(entregasIniciais)
  const [tela, setTela] = useState<'inicio' | 'nova' | 'go'>('inicio')
  const [tipo, setTipo] = useState<'ifood' | 'por_fora'>('ifood')
  const [codigoIfood, setCodigoIfood] = useState('')
  const [enderecoIfood, setEnderecoIfood] = useState('')
  const [enderecoSelecionado, setEnderecoSelecionado] = useState('')
  const [enderecoLivre, setEnderecoLivre] = useState('')
  const [usandoLivre, setUsandoLivre] = useState(false)
  const [km, setKm] = useState('')
  const [calculandoKm, setCalculandoKm] = useState(false)
  const [kmManual, setKmManual] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [avisoTurno, setAvisoTurno] = useState<{ titulo: string; texto: string } | null>(null)
  const [bloqueado, setBloqueado] = useState(false)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const turno = getTurnoInfo()
  const router = useRouter()

  // Verifica horário de funcionamento e aviso de virada de turno
  useEffect(() => {
    function verificar() {
      const totalMin = getMinutosBRT()

      // Bloqueio antes das 09:00 e após 23:30
      if (totalMin < 9 * 60 || totalMin >= 23 * 60 + 30) {
        setBloqueado(true)
        setMotivoBloqueio(totalMin < 9 * 60
          ? '⏰ O quiosque só funciona a partir das 09:00.'
          : '🌙 O quiosque encerrou às 23:30. Até amanhã!')
      } else {
        setBloqueado(false)
      }

      // Aviso de virada de turno — janela de 15 min, uma vez por dia
      const diaHoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const avisos = [
        { inicio: 9 * 60 + 30, chave: `aviso_manha_${diaHoje}`, titulo: '🌅 Início do turno manhã', texto: 'Atualize a escala de motoboys antes de começar as entregas do turno da manhã.' },
        { inicio: 16 * 60,     chave: `aviso_noite_${diaHoje}`, titulo: '🌙 Início do turno noite', texto: 'Atualize a escala de motoboys para o turno da noite.' },
      ]
      for (const a of avisos) {
        if (totalMin >= a.inicio && totalMin < a.inicio + 15) {
          if (!localStorage.getItem(a.chave)) {
            localStorage.setItem(a.chave, '1')
            setAvisoTurno({ titulo: a.titulo, texto: a.texto })
          }
        }
      }
    }

    verificar()
    const id = setInterval(verificar, 60_000) // recheck a cada minuto
    return () => clearInterval(id)
  }, [])

  const enderecoAtual = usandoLivre
    ? enderecoLivre
    : enderecosFavoritos.find(e => e.id === enderecoSelecionado)?.endereco_completo || ''

  const kmNum = parseFloat(km.replace(',', '.'))
  const valorCalculado = !isNaN(kmNum) && kmNum > 0 ? calcularValorPorKm(kmNum) : 0
  const totalValor = entregas.reduce((s, e) => s + e.valor_km, 0)
  const totalKm = entregas.reduce((s, e) => s + (e.km_calculado || 0), 0)
  // Diária por turno: soma manhã e/ou noite conforme entregas registradas
  const temManha = entregas.some(e => getTurno(new Date(e.created_at)) === 'manha')
  const temNoite = entregas.some(e => getTurno(new Date(e.created_at)) === 'noite')
  const diariaManha = profile.tipo === 'fixo' ? DIARIA_MANHA_FIXO : DIARIA_MANHA_AVULSO
  const valorDiaria = (temManha ? diariaManha : 0) + (temNoite ? DIARIA_NOITE : 0)
  const podeConfirmar = tipo === 'ifood' ? codigoIfood && enderecoIfood && kmNum > 0 : enderecoAtual && kmNum > 0

  const calcularKmAuto = useCallback(async (endereco: string) => {
    if (!endereco) return
    setCalculandoKm(true); setKm('')
    try {
      const res = await fetch(`/api/calcular-km?destino=${encodeURIComponent(endereco)}`)
      const data = await res.json()
      if (data.km) { setKm(String(data.km)); setKmManual(false) } else { setKmManual(true) }
    } catch { setKmManual(true) } finally { setCalculandoKm(false) }
  }, [])

  useEffect(() => {
    if (tipo === 'por_fora' && enderecoAtual) calcularKmAuto(enderecoAtual)
  }, [enderecoAtual, tipo, calcularKmAuto])

  async function salvarEntrega() {
    const enderecoFinal = tipo === 'ifood' ? `${enderecoIfood} (iFood #${codigoIfood})` : enderecoAtual
    if (!enderecoFinal || !kmNum || kmNum <= 0) return
    setSalvando(true)
    const res = await fetch('/api/quiosque', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motoboy_id: profile.id, tipo,
        codigo_ifood: tipo === 'ifood' ? codigoIfood : null,
        endereco_destino: enderecoFinal, km_calculado: kmNum, valor_km: valorCalculado,
        endereco_livre: tipo === 'por_fora' && usandoLivre,
      }),
    })
    const data = await res.json()
    if (!data.error) {
      setEntregas(prev => [data, ...prev])
      setSucesso(true)
      setTimeout(() => {
        setSucesso(false)
        setCodigoIfood(''); setEnderecoIfood(''); setEnderecoSelecionado(''); setEnderecoLivre(''); setKm(''); setKmManual(false)
        setTela('inicio')
      }, 1500)
    }
    setSalvando(false)
  }

  const entregasPendentes = entregas.filter(e => !e.enviado_go)

  async function abrirWhatsApp() {
    const msg = gerarMensagem(profile.nome, entregasPendentes)
    const idsParaMarcar = entregasPendentes.map(e => e.id)

    // Marca como enviado ANTES de abrir o WhatsApp: no celular, trocar de app
    // pode suspender a aba e impedir que um fetch disparado depois do
    // window.open termine, deixando a marcação incompleta.
    if (idsParaMarcar.length > 0) {
      try {
        await fetch('/api/quiosque', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motoboy_id: profile.id, ids: idsParaMarcar }),
        })
      } catch {}
      setEntregas(prev => prev.map(e => idsParaMarcar.includes(e.id) ? { ...e, enviado_go: true } : e))
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')

    // Quando o usuário voltar do WhatsApp para o browser, redireciona
    // para a seleção de motoboys em vez de ficar na tela deste motoboy.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', handleVisibility)
        router.push('/quiosque')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    setTela('inicio')
  }

  // TELA INÍCIO
  if (tela === 'inicio') {
    return (
      <div className="min-h-screen bg-[#F7941D] flex flex-col">

        {/* Modal aviso de virada de turno */}
        {avisoTurno && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
            <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl text-center">
              <div className="text-5xl mb-4">{avisoTurno.titulo.split(' ')[0]}</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{avisoTurno.titulo.slice(3)}</h2>
              <p className="text-gray-500 text-sm mb-6">{avisoTurno.texto}</p>
              <button onClick={() => setAvisoTurno(null)}
                className="w-full bg-[#F7941D] text-white font-black py-4 rounded-2xl text-lg active:scale-95 transition-transform">
                Entendido ✅
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-8 pb-2">
          <button onClick={() => router.push('/quiosque')} className="bg-white/20 text-white rounded-2xl px-4 py-2 text-sm font-semibold flex items-center gap-2 active:scale-95">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="bg-black/25 text-white text-sm font-bold px-4 py-2 rounded-full shadow-md flex items-center gap-1.5">
            <span className="text-base">{turno.emoji}</span> Turno {turno.label}
          </div>
        </div>

        {/* Nome do motoboy */}
        <div className="text-center px-6 py-6">
          <div className="text-6xl mb-3">🛵</div>
          <h1 className="text-4xl font-black text-white drop-shadow">{profile.nome.split(' ')[0]}</h1>
          <p className="text-white/70 mt-1">All Natural · Batel</p>
        </div>

        {/* Stats */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 rounded-2xl p-4 text-center text-white">
              <Package size={20} className="mx-auto mb-1 opacity-80" />
              <div className="text-2xl font-black">{entregas.length}</div>
              <div className="text-xs text-white/70">entregas</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 text-center text-white">
              <TrendingUp size={20} className="mx-auto mb-1 opacity-80" />
              <div className="text-2xl font-black">{totalKm.toFixed(1)}</div>
              <div className="text-xs text-white/70">km</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 text-center text-white">
              <div className="text-xl mb-1">💰</div>
              <div className="text-2xl font-black">{formatarValor(totalValor + valorDiaria).replace('R$ ', '')}</div>
              <div className="text-xs text-white/70">total</div>
            </div>
          </div>
        </div>

        {/* Botões principais */}
        <div className="px-6 space-y-3 flex-1">
          {bloqueado ? (
            <div className="w-full bg-white/30 text-white/80 font-bold text-base py-5 rounded-3xl text-center px-4">
              {motivoBloqueio}
            </div>
          ) : (
            <button onClick={() => setTela('nova')}
              className="w-full bg-white text-[#F7941D] font-black text-xl py-6 rounded-3xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3">
              <Plus size={28} /> Nova Entrega
            </button>
          )}

          {entregasPendentes.length > 0 && (
            <button onClick={() => setTela('go')}
              className="w-full bg-green-500 text-white font-black text-xl py-6 rounded-3xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3">
              <Send size={28} /> Enviar GO 📲
            </button>
          )}
        </div>

        {/* Lista de entregas de hoje */}
        {entregas.length > 0 && (
          <div className="px-6 mt-6 pb-8">
            <p className="text-white/70 text-sm font-semibold mb-3">Entregas de hoje:</p>
            <div className="space-y-2">
              {entregas.slice(0, 5).map((e, i) => (
                <div key={e.id} className="bg-white/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{e.tipo === 'ifood' ? '🛍️' : '📦'}</span>
                    <span className="text-white text-sm truncate">{e.endereco_destino}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-white font-bold text-sm">{formatarValor(e.valor_km)}</span>
                    <span className="text-white/50 text-xs block">{formatarHora(e.created_at)}</span>
                  </div>
                </div>
              ))}
              {entregas.length > 5 && <p className="text-white/50 text-xs text-center">+{entregas.length - 5} mais entregas</p>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // TELA GO (WhatsApp)
  if (tela === 'go') {
    const msg = gerarMensagem(profile.nome, entregasPendentes)
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col p-6">
        <button onClick={() => setTela('inicio')} className="flex items-center gap-2 text-[#F7941D] font-semibold mb-6">
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-2xl font-black text-gray-900 mb-2">📲 Enviar GO</h2>
        <p className="text-gray-500 text-sm mb-4">Mensagem que será enviada:</p>
        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 flex-1 mb-6">
          <pre className="text-gray-800 whitespace-pre-wrap font-sans text-base leading-relaxed">{msg}</pre>
        </div>
        <div className="space-y-3">
          <button onClick={abrirWhatsApp}
            className="w-full bg-green-500 text-white font-black text-xl py-6 rounded-3xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3">
            <Send size={28} /> Confirmar GO ✅
          </button>
          <button onClick={() => setTela('inicio')}
            className="w-full border-2 border-gray-200 text-gray-600 font-bold text-lg py-4 rounded-3xl active:scale-95 transition-transform">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // TELA NOVA ENTREGA
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      <div className="bg-[#F7941D] px-6 pt-6 pb-5">
        <button onClick={() => setTela('inicio')} className="flex items-center gap-2 text-white/80 font-semibold mb-4 text-sm">
          <ArrowLeft size={18} /> {profile.nome.split(' ')[0]}
        </button>
        <h2 className="text-2xl font-black text-white">Nova Entrega</h2>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4 max-w-lg mx-auto w-full">
        {/* Tipo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setTipo('ifood'); setKm(''); setKmManual(false) }}
              className={`py-4 rounded-2xl font-bold text-base transition-all ${tipo === 'ifood' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>🛍️ iFood</button>
            <button onClick={() => { setTipo('por_fora'); setKm(''); setKmManual(false) }}
              className={`py-4 rounded-2xl font-bold text-base transition-all ${tipo === 'por_fora' ? 'bg-[#F7941D] text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>📦 Por Fora</button>
          </div>
        </div>

        {/* Campos iFood */}
        {tipo === 'ifood' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Código iFood</label>
              <input type="text" value={codigoIfood} onChange={e => setCodigoIfood(e.target.value.toUpperCase())}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-mono focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                placeholder="Ex: ABC-1234" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço do cliente</label>
              <AutocompleteInput value={enderecoIfood} onChange={setEnderecoIfood}
                onBlur={(v) => v && calcularKmAuto(v)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                placeholder="Ex: Rua XV de Novembro 123" />
            </div>
            {calculandoKm && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-[#F7941D] border-t-transparent rounded-full" />
                Calculando km...
              </div>
            )}
            {kmManual && enderecoIfood && !calculandoKm && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Distância (km)</label>
                <input type="number" value={km} onChange={e => setKm(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                  placeholder="Ex: 4.5" step="0.1" min="0" />
              </div>
            )}
            {!kmManual && km && !calculandoKm && (
              <div className="flex items-center gap-2 text-sm text-[#F7941D] bg-orange-50 rounded-xl px-3 py-2">
                <span>📍</span><span className="font-semibold">{km} km calculado</span>
                <button onClick={() => { setKm(''); setKmManual(true) }} className="ml-auto text-xs text-gray-400 underline">editar</button>
              </div>
            )}
          </div>
        )}

        {/* Campos Por Fora */}
        {tipo === 'por_fora' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Destino</label>
            {!usandoLivre ? (
              <>
                <select value={enderecoSelecionado} onChange={e => setEnderecoSelecionado(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50">
                  <option value="">Selecionar destino...</option>
                  {enderecosFavoritos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
                <button onClick={() => { setUsandoLivre(true); setEnderecoSelecionado(''); setKm(''); setKmManual(false) }}
                  className="text-sm text-[#F7941D] font-medium">+ Digitar outro endereço</button>
              </>
            ) : (
              <>
                <AutocompleteInput value={enderecoLivre} onChange={setEnderecoLivre}
                  onBlur={(v) => v && calcularKmAuto(v)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                  placeholder="Ex: Rua XV de Novembro 123, Curitiba" />
                <button onClick={() => { setUsandoLivre(false); setEnderecoLivre(''); setKm(''); setKmManual(false) }}
                  className="text-sm text-[#F7941D] font-medium">← Usar destino salvo</button>
              </>
            )}
            {calculandoKm && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-[#F7941D] border-t-transparent rounded-full" />
                Calculando km...
              </div>
            )}
            {kmManual && enderecoAtual && !calculandoKm && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Distância (km)</label>
                <input type="number" value={km} onChange={e => setKm(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                  placeholder="Ex: 6.0" step="0.1" min="0" />
              </div>
            )}
            {!kmManual && km && !calculandoKm && (
              <div className="flex items-center gap-2 text-sm text-[#F7941D] bg-orange-50 rounded-xl px-3 py-2">
                <span>📍</span><span className="font-semibold">{km} km calculado</span>
                <button onClick={() => { setKm(''); setKmManual(true) }} className="ml-auto text-xs text-gray-400 underline">editar</button>
              </div>
            )}
          </div>
        )}

        {/* Valor */}
        {valorCalculado > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Valor da corrida</p><p className="text-3xl font-black text-[#F7941D]">{formatarValor(valorCalculado)}</p></div>
            <div className="text-sm text-gray-500">{kmNum.toFixed(1)} km</div>
          </div>
        )}

        {/* Botão Confirmar */}
        <button onClick={salvarEntrega} disabled={!podeConfirmar || salvando || sucesso}
          className={`w-full py-6 rounded-3xl font-black text-xl transition-all shadow-lg ${sucesso ? 'bg-green-500 text-white' : podeConfirmar ? 'bg-[#F7941D] active:scale-95 text-white' : 'bg-gray-200 text-gray-400'}`}>
          {sucesso ? '✅ Entrega registrada!' : salvando ? 'Salvando...' : '✅ Confirmar Entrega'}
        </button>
      </div>
    </div>
  )
}
