'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularValorPorKm, formatarValor } from '@/lib/km'
import { useRouter } from 'next/navigation'
import { LogOut, Plus, Clock, TrendingUp, Package, Calendar, Send } from 'lucide-react'
import AutocompleteInput from '@/components/AutocompleteInput'
import { getTurno, getTurnoInfo } from '@/lib/turno'

const DIARIA_NOITE_MOTOBOY = 40

type Profile = { id: string; nome: string; tipo: string; role: string; valor_diaria: number }
type Entrega = { id: string; tipo: string; codigo_ifood: string | null; endereco_destino: string; km_calculado: number | null; valor_km: number; created_at: string }
type EnderecoFav = { id: string; nome: string; endereco_completo: string }

interface Props {
  profile: Profile
  entregasIniciais: Entrega[]
  todasEntregas: Entrega[]
  enderecosFavoritos: EnderecoFav[]
}

function formatarDataBrasilia(utcString: string) {
  return new Date(utcString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}

function formatarDiaBrasilia(utcString: string) {
  return new Date(utcString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
}

function gerarMensagemWhatsApp(nome: string, entregas: Entrega[]): string {
  const numeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
  const ifood = entregas.filter(e => e.tipo === 'ifood' && e.codigo_ifood)
  if (ifood.length === 0) {
    const porFora = entregas.filter(e => e.tipo === 'por_fora')
    if (porFora.length === 0) return `🛵 *${nome}* saiu para entrega!\n\nDespachar no iFood! ✅`
    const linhas = porFora.map((e, i) => `${numeros[i] || `${i + 1}.`} ${e.endereco_destino}`).join('\n')
    return `🛵 *${nome}* saiu com *${porFora.length} ${porFora.length === 1 ? 'pedido' : 'pedidos'}*:\n${linhas}\n\n✅`
  }
  const linhas = ifood.map((e, i) => `${numeros[i] || `${i + 1}.`} ${e.codigo_ifood}`).join('\n')
  return `🛵 *${nome}* saiu com *${ifood.length} ${ifood.length === 1 ? 'pedido' : 'pedidos'}*:\n${linhas}\n\nDespachar no iFood! ✅`
}

export default function DashboardClient({ profile, entregasIniciais, todasEntregas, enderecosFavoritos }: Props) {
  const [entregas, setEntregas] = useState<Entrega[]>(entregasIniciais)
  const [aba, setAba] = useState<'nova' | 'historico' | 'tudo'>('nova')
  const [tipo, setTipo] = useState<'ifood' | 'por_fora'>('ifood')
  const [codigoIfood, setCodigoIfood] = useState('')
  const [enderecoIfood, setEnderecoIfood] = useState('')
  const [enderecoSelecionado, setEnderecoSelecionado] = useState('')
  const [enderecoLivre, setEnderecoLivre] = useState('')
  const [usandoEnderecoLivre, setUsandoEnderecoLivre] = useState(false)
  const [km, setKm] = useState('')
  const [calculandoKm, setCalculandoKm] = useState(false)
  const [kmManual, setKmManual] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [showGoModal, setShowGoModal] = useState(false)
  const turno = getTurnoInfo()

  const supabase = createClient()
  const router = useRouter()

  const enderecoAtual = usandoEnderecoLivre
    ? enderecoLivre
    : enderecosFavoritos.find(e => e.id === enderecoSelecionado)?.endereco_completo || ''

  const kmNum = parseFloat(km.replace(',', '.'))
  const valorCalculado = !isNaN(kmNum) && kmNum > 0 ? calcularValorPorKm(kmNum) : 0
  const valorDiaria = profile.valor_diaria || 30

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
    const enderecoFinal = tipo === 'ifood'
      ? `${enderecoIfood} (iFood #${codigoIfood})`
      : enderecoAtual
    if (!enderecoFinal || !kmNum || kmNum <= 0) return
    setSalvando(true)
    const { data, error } = await supabase.from('entregas').insert({
      motoboy_id: profile.id, tipo,
      codigo_ifood: tipo === 'ifood' ? codigoIfood : null,
      endereco_destino: enderecoFinal, km_calculado: kmNum, valor_km: valorCalculado,
    }).select().single()
    if (!error && data) {
      setEntregas(prev => [data, ...prev]); setSucesso(true); setTimeout(() => setSucesso(false), 2000)
      setCodigoIfood(''); setEnderecoIfood(''); setEnderecoSelecionado(''); setEnderecoLivre(''); setKm(''); setKmManual(false)
    }
    setSalvando(false)
  }

  function abrirWhatsApp() {
    const msg = gerarMensagemWhatsApp(profile.nome, entregas)
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setShowGoModal(false)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/login') }

  const totalKm = entregas.reduce((s, e) => s + (e.km_calculado || 0), 0)
  const totalValor = entregas.reduce((s, e) => s + e.valor_km, 0)
  const temManha = entregas.some(e => getTurno(new Date(e.created_at)) === 'manha')
  const temNoite = entregas.some(e => getTurno(new Date(e.created_at)) === 'noite')
  const totalDiarias = (temManha ? valorDiaria : 0) + (temNoite ? DIARIA_NOITE_MOTOBOY : 0)
  const totalDia = totalValor + totalDiarias
  const podeConfirmar = tipo === 'ifood'
    ? codigoIfood && enderecoIfood && kmNum > 0
    : enderecoAtual && kmNum > 0

  const porDia = todasEntregas.reduce((acc, e) => {
    const dia = formatarDiaBrasilia(e.created_at)
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e)
    return acc
  }, {} as Record<string, Entrega[]>)

  const msgWhatsApp = gerarMensagemWhatsApp(profile.nome, entregas)

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      {/* Header */}
      <header className="bg-[#2B6344] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛵</span>
            <span className="font-bold text-lg">{profile.nome.split(' ')[0]}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${turno.cor}`}>
              {turno.emoji} {turno.label}
            </span>
          </div>
          <p className="text-[#EDD9A3]/70 text-xs mt-0.5">Al'hamin · Curitiba</p>
        </div>
        <div className="flex items-center gap-2">
          {entregas.length > 0 && (
            <button onClick={() => setShowGoModal(true)}
              className="flex items-center gap-1 bg-white text-[#2B6344] font-bold px-3 py-2 rounded-xl text-sm shadow-sm active:scale-95 transition-transform">
              <Send size={14} /> GO
            </button>
          )}
          <button onClick={sair} className="p-2 rounded-full hover:bg-orange-600"><LogOut size={18} /></button>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-[#2B6344] px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-xl p-3 text-white text-center">
            <Package size={16} className="mx-auto mb-1 opacity-80" />
            <div className="text-xl font-bold">{entregas.length}</div>
            <div className="text-xs text-[#EDD9A3]/70">entregas</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-white text-center">
            <TrendingUp size={16} className="mx-auto mb-1 opacity-80" />
            <div className="text-xl font-bold">{totalKm.toFixed(1)}</div>
            <div className="text-xs text-[#EDD9A3]/70">km hoje</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-white text-center">
            <span className="text-base block mb-1">💰</span>
            <div className="text-xl font-bold">{formatarValor(totalDia).replace('R$ ', '')}</div>
            <div className="text-xs text-[#EDD9A3]/70">total hoje</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 sticky top-[72px] z-10 shadow-sm">
        <button onClick={() => setAba('nova')} className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors ${aba === 'nova' ? 'border-[#2B6344] text-[#2B6344]' : 'border-transparent text-gray-400'}`}>
          <Plus size={14} /> Nova
        </button>
        <button onClick={() => setAba('historico')} className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors ${aba === 'historico' ? 'border-[#2B6344] text-[#2B6344]' : 'border-transparent text-gray-400'}`}>
          <Clock size={14} /> Hoje ({entregas.length})
        </button>
        <button onClick={() => setAba('tudo')} className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors ${aba === 'tudo' ? 'border-[#2B6344] text-[#2B6344]' : 'border-transparent text-gray-400'}`}>
          <Calendar size={14} /> Histórico
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* ABA NOVA */}
        {aba === 'nova' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de entrega</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setTipo('ifood'); setKm(''); setKmManual(false) }}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${tipo === 'ifood' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>🛍️ iFood</button>
                <button onClick={() => { setTipo('por_fora'); setKm(''); setKmManual(false) }}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${tipo === 'por_fora' ? 'bg-[#2B6344] text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>📦 Por Fora</button>
              </div>
            </div>

            {tipo === 'ifood' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código do pedido iFood</label>
                  <input type="text" value={codigoIfood} onChange={e => setCodigoIfood(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                    placeholder="Ex: ABC-1234" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço do cliente</label>
                  <AutocompleteInput value={enderecoIfood} onChange={setEnderecoIfood}
                    onBlur={(v) => v && calcularKmAuto(v)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                    placeholder="Ex: Rua XV de Novembro 123" />
                </div>
                {calculandoKm && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin h-4 w-4 border-2 border-[#2B6344] border-t-transparent rounded-full" />
                    Calculando km...
                  </div>
                )}
                {kmManual && enderecoIfood && !calculandoKm && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Distância (km)</label>
                    <input type="number" value={km} onChange={e => setKm(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                      placeholder="Ex: 4.5" step="0.1" min="0" />
                    <p className="text-xs text-amber-600 mt-1">📍 Informe o km manualmente</p>
                  </div>
                )}
                {!kmManual && km && !calculandoKm && (
                  <div className="flex items-center gap-2 text-sm text-[#2B6344] bg-green-50 rounded-xl px-3 py-2">
                    <span>📍</span><span className="font-semibold">{km} km</span>
                    <span className="text-gray-500">calculado automaticamente</span>
                    <button onClick={() => { setKm(''); setKmManual(true) }} className="ml-auto text-xs text-gray-400 underline">editar</button>
                  </div>
                )}
              </div>
            )}

            {tipo === 'por_fora' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Destino</label>
                {!usandoEnderecoLivre ? (
                  <>
                    <select value={enderecoSelecionado} onChange={e => setEnderecoSelecionado(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50">
                      <option value="">Selecionar destino...</option>
                      {enderecosFavoritos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <button onClick={() => { setUsandoEnderecoLivre(true); setEnderecoSelecionado(''); setKm(''); setKmManual(false) }}
                      className="text-sm text-[#2B6344] font-medium">+ Digitar outro endereço</button>
                  </>
                ) : (
                  <>
                    <AutocompleteInput value={enderecoLivre} onChange={setEnderecoLivre}
                      onBlur={(v) => v && calcularKmAuto(v)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                      placeholder="Ex: Rua XV de Novembro 123, Curitiba" />
                    <button onClick={() => { setUsandoEnderecoLivre(false); setEnderecoLivre(''); setKm(''); setKmManual(false) }}
                      className="text-sm text-[#2B6344] font-medium">← Usar destino salvo</button>
                  </>
                )}
                {calculandoKm && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin h-4 w-4 border-2 border-[#2B6344] border-t-transparent rounded-full" />
                    Calculando km...
                  </div>
                )}
                {kmManual && enderecoAtual && !calculandoKm && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Distância (km)</label>
                    <input type="number" value={km} onChange={e => setKm(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B6344] bg-gray-50"
                      placeholder="Ex: 6.0" step="0.1" min="0" />
                    <p className="text-xs text-amber-600 mt-1">📍 Informe o km manualmente</p>
                  </div>
                )}
                {!kmManual && km && !calculandoKm && (
                  <div className="flex items-center gap-2 text-sm text-[#2B6344] bg-green-50 rounded-xl px-3 py-2">
                    <span>📍</span><span className="font-semibold">{km} km</span>
                    <span className="text-gray-500">calculado automaticamente</span>
                    <button onClick={() => { setKm(''); setKmManual(true) }} className="ml-auto text-xs text-gray-400 underline">editar</button>
                  </div>
                )}
              </div>
            )}

            {valorCalculado > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Valor da corrida</p><p className="text-2xl font-bold text-[#2B6344]">{formatarValor(valorCalculado)}</p></div>
                  <div className="text-right text-sm text-gray-500"><p>{kmNum.toFixed(1)} km</p></div>
                </div>
              </div>
            )}

            <button onClick={salvarEntrega} disabled={!podeConfirmar || salvando || sucesso}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-md ${sucesso ? 'bg-green-500 text-white' : podeConfirmar ? 'bg-[#2B6344] hover:bg-[#1e4d31] active:scale-95 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {sucesso ? '✅ Entrega registrada!' : salvando ? 'Salvando...' : '✅ Confirmar entrega'}
            </button>
          </div>
        )}

        {/* ABA HOJE */}
        {aba === 'historico' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo de hoje</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Corridas ({entregas.length}x)</span><span className="font-semibold">{formatarValor(totalValor)}</span></div>
                {temManha && <div className="flex justify-between text-sm"><span className="text-gray-500">Diária manhã 🌅</span><span className="font-semibold">{formatarValor(valorDiaria)}</span></div>}
                {temNoite && <div className="flex justify-between text-sm"><span className="text-gray-500">Diária noite 🌙</span><span className="font-semibold">{formatarValor(DIARIA_NOITE_MOTOBOY)}</span></div>}
                <div className="border-t border-gray-100 pt-2 flex justify-between"><span className="font-bold text-gray-800">Total do dia</span><span className="font-bold text-[#2B6344] text-lg">{formatarValor(totalDia)}</span></div>
              </div>
            </div>

            {entregas.length > 0 && (
              <button onClick={() => setShowGoModal(true)}
                className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg shadow-md transition-all flex items-center justify-center gap-2">
                <Send size={20} /> Enviar GO no WhatsApp
              </button>
            )}

            {entregas.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">📭</span>Nenhuma entrega hoje</div>
            ) : (
              entregas.map((e, i) => (
                <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <div className="text-lg mt-0.5">{e.tipo === 'ifood' ? '🛍️' : '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.endereco_destino}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{e.km_calculado ? `${e.km_calculado} km · ` : ''}{formatarDataBrasilia(e.created_at)}</p>
                  </div>
                  <div className="text-right"><p className="font-bold text-[#2B6344]">{formatarValor(e.valor_km)}</p><p className="text-xs text-gray-400">#{entregas.length - i}</p></div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {aba === 'tudo' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Histórico completo</h2>
            {Object.entries(porDia).map(([dia, ents]) => {
              const totalDiaHist = ents.reduce((s, e) => s + e.valor_km, 0)
              const diaManha = ents.some(e => getTurno(new Date(e.created_at)) === 'manha')
              const diaNoite = ents.some(e => getTurno(new Date(e.created_at)) === 'noite')
              const diaDiarias = (diaManha ? valorDiaria : 0) + (diaNoite ? DIARIA_NOITE_MOTOBOY : 0)
              return (
                <div key={dia} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-orange-100">
                    <span className="font-semibold text-gray-800">📅 {dia}</span>
                    <span className="text-sm font-bold text-[#2B6344]">{ents.length} entregas · {formatarValor(totalDiaHist + diaDiarias)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {ents.map(e => (
                      <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="text-base mt-0.5">{e.tipo === 'ifood' ? '🛍️' : '📦'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{e.endereco_destino}</p>
                          <p className="text-xs text-gray-400">{e.km_calculado ? `${e.km_calculado} km · ` : ''}{formatarDataBrasilia(e.created_at)}</p>
                        </div>
                        <p className="font-bold text-[#2B6344] text-sm">{formatarValor(e.valor_km)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {todasEntregas.length === 0 && (
              <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">📭</span>Nenhuma entrega registrada</div>
            )}
          </div>
        )}
      </div>

      {/* Modal GO WhatsApp */}
      {showGoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setShowGoModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg mb-1">📲 Enviar GO</h3>
            <p className="text-sm text-gray-500 mb-4">Mensagem para o grupo:</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{msgWhatsApp}</pre>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowGoModal(false)}
                className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">
                Cancelar
              </button>
              <button onClick={abrirWhatsApp}
                className="py-3 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Send size={16} /> Enviar GO ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
