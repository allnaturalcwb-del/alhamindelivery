'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatarValor } from '@/lib/km'
import { useRouter } from 'next/navigation'
import { LogOut, Users, MapPin, BarChart3, RefreshCw, Plus, Trash2, Calendar, FileText, Pencil, Check, X, Upload, AlertTriangle, CheckCircle2, CreditCard, ExternalLink } from 'lucide-react'
import AutocompleteInput from '@/components/AutocompleteInput'
import { getQuinzenaComOffset, formatarPeriodo, type Quinzena } from '@/lib/quinzena'
import { gerarRelatorio } from '@/lib/relatorio'
import { contarDiasAtivosPorTurno, getTurno, getTurnoInfo } from '@/lib/turno'
import tenant from '@/lib/tenant'

function getProximoPagamento() {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const ano = agora.getFullYear()
  const mes = agora.getMonth()
  const candidatos = [
    new Date(ano, mes, 5), new Date(ano, mes, 20),
    new Date(ano, mes + 1, 5), new Date(ano, mes + 1, 20),
  ].filter(d => d > agora)
  const proximo = new Date(candidatos[0])
  const dow = proximo.getDay()
  if (dow === 6) proximo.setDate(proximo.getDate() + 2)
  if (dow === 0) proximo.setDate(proximo.getDate() + 1)
  const dias = Math.ceil((proximo.getTime() - agora.getTime()) / 86400000)
  const dataFmt = proximo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  const semanaFmt = proximo.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' })
  return { dataFmt, semanaFmt, dias }
}

// Tarifas admin (versão interna — usadas no painel e no relatório quinzenal modo admin)
const DIARIA_MANHA_FIXO = 45
const DIARIA_MANHA_AVULSO = 35
const DIARIA_NOITE = 45

type Profile = { id: string; nome: string; tipo: string; role: string; valor_diaria: number; ativo?: boolean }
type Entrega = { id: string; tipo: string; codigo_ifood: string | null; endereco_destino: string; km_calculado: number | null; valor_km: number; created_at: string; motoboy_nome: string; motoboy_tipo: string; motoboy_id: string }
type Endereco = { id: string; nome: string; endereco_completo: string; ativo: boolean }

interface Props {
  profile: Profile
  entregasIniciais: Entrega[]
  todasEntregas: Entrega[]
  motoboysList: Profile[]
  enderecosList: Endereco[]
}

function formatarDataBrasilia(utcString: string) {
  return new Date(utcString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}

function formatarDiaBrasilia(utcString: string) {
  return new Date(utcString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
}

function getInicioSemana(offset = 0): Date {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dia = agora.getDay()
  const seg = new Date(agora)
  seg.setDate(agora.getDate() - dia + 1 + offset * 7)
  seg.setHours(0, 0, 0, 0)
  return seg
}

export default function AdminClient({ profile, entregasIniciais, todasEntregas, motoboysList, enderecosList }: Props) {
  const [aba, setAba] = useState<'entregas' | 'historico' | 'relatorio' | 'quinzena' | 'motoboys' | 'enderecos' | 'assinatura'>('entregas')

  // Aba Assinatura — estado
  const [assCpfCnpj, setAssCpfCnpj] = useState('')
  const [assNome, setAssNome] = useState('')
  const [assEmail, setAssEmail] = useState('')
  const [assTelefone, setAssTelefone] = useState('')
  const [assPlano, setAssPlano] = useState<'custom'>('custom')
  const [assValorImpl, setAssValorImpl] = useState('147')
  const [assValorMens, setAssValorMens] = useState('197')
  const [assLoading, setAssLoading] = useState(false)
  const [assResultado, setAssResultado] = useState<Record<string, unknown> | null>(null)
  const [assErro, setAssErro] = useState('')
  const [assStatusData, setAssStatusData] = useState<Record<string, unknown> | null>(null)
  const [assStatusLoading, setAssStatusLoading] = useState(false)
  const [entregas, setEntregas] = useState<Entrega[]>(entregasIniciais)
  const [todasEntregasState, setTodasEntregasState] = useState<Entrega[]>(todasEntregas)
  const [excluindoEntregaId, setExcluindoEntregaId] = useState<string | null>(null)
  const [motoboys, setMotoboys] = useState<Profile[]>(motoboysList)
  const [enderecos, setEnderecos] = useState<Endereco[]>(enderecosList)
  const [carregando, setCarregando] = useState(false)
  const [novoEndNome, setNovoEndNome] = useState('')
  const [novoEndCompleto, setNovoEndCompleto] = useState('')
  const [salvandoEnd, setSalvandoEnd] = useState(false)
  const [editandoEnd, setEditandoEnd] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCompleto, setEditCompleto] = useState('')
  const [editandoEntrega, setEditandoEntrega] = useState<string | null>(null)
  const [popupMotoboys, setPopupMotoboys] = useState(false)
  const [editEnderecoEntrega, setEditEnderecoEntrega] = useState('')
  const [salvandoEntregaId, setSalvandoEntregaId] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoTipo, setNovoTipo] = useState<'fixo' | 'avulso'>('fixo')
  const [novadiaria, setNovaDiaria] = useState('30')
  const [salvandoMotoboy, setSalvandoMotoboy] = useState(false)
  const [erroMotoboy, setErroMotoboy] = useState('')
  const [editandoMotoboy, setEditandoMotoboy] = useState<string | null>(null)
  const [editMotoboyTipo, setEditMotoboyTipo] = useState<'fixo' | 'avulso'>('fixo')
  const [editMotoboyDiaria, setEditMotoboyDiaria] = useState('')
  const [editMotoboyNome, setEditMotoboyNome] = useState('')
  const [salvandoEdicaoMotoboy, setSalvandoEdicaoMotoboy] = useState(false)
  const [semanaOffset, setSemanaOffset] = useState(0) // 0 = semana atual, -1 = semana passada

  // Quinzena
  const [quinzenaOffset, setQuinzenaOffset] = useState(0) // 0=atual, -1=anterior, etc
  const [quinzenaArquivo, setQuinzenaArquivo] = useState<File | null>(null)
  const [quinzenaCruzamento, setQuinzenaCruzamento] = useState<{ totalSistema: number; totalIfood: number; ok: boolean } | null>(null)
  const [quinzenaEnviando, setQuinzenaEnviando] = useState(false)
  const [quinzenaEnviado, setQuinzenaEnviado] = useState(false)
  const [quinzenaEntregas, setQuinzenaEntregas] = useState<Entrega[]>([])
  const [quinzenaCarregando, setQuinzenaCarregando] = useState(false)
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  const supabase = createClient()
  const router = useRouter()

  const totalValorCorridas = entregas.reduce((s, e) => s + e.valor_km, 0)
  const totalKm = entregas.reduce((s, e) => s + (e.km_calculado || 0), 0)
  const totalDiarias = motoboys.filter(m => m.role === 'motoboy').reduce((s, m) => s + (m.valor_diaria || 30), 0)

  async function recarregar() {
    setCarregando(true)
    const diaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const hoje = new Date(diaStr + 'T03:00:00.000Z')
    const { data } = await supabase.from('entregas_completas').select('*').gte('created_at', hoje.toISOString()).order('created_at', { ascending: false })
    setEntregas(data || [])
    setCarregando(false)
  }

  async function adicionarEndereco() {
    if (!novoEndNome || !novoEndCompleto) return
    setSalvandoEnd(true)
    const { data, error } = await supabase.from('enderecos_favoritos').insert({ nome: novoEndNome, endereco_completo: novoEndCompleto }).select().single()
    if (!error && data) { setEnderecos(prev => [...prev, data]); setNovoEndNome(''); setNovoEndCompleto('') }
    setSalvandoEnd(false)
  }

  async function removerEndereco(id: string) {
    await supabase.from('enderecos_favoritos').update({ ativo: false }).eq('id', id)
    setEnderecos(prev => prev.map(e => e.id === id ? { ...e, ativo: false } : e))
  }

  function iniciarEdicao(e: Endereco) {
    setEditandoEnd(e.id)
    setEditNome(e.nome)
    setEditCompleto(e.endereco_completo)
  }

  async function salvarEdicao(id: string) {
    if (!editNome || !editCompleto) return
    await supabase.from('enderecos_favoritos').update({ nome: editNome, endereco_completo: editCompleto }).eq('id', id)
    setEnderecos(prev => prev.map(e => e.id === id ? { ...e, nome: editNome, endereco_completo: editCompleto } : e))
    setEditandoEnd(null)
  }

  function iniciarEdicaoEntrega(e: Entrega) {
    setEditandoEntrega(e.id)
    setEditEnderecoEntrega(e.endereco_destino)
  }

  async function salvarEdicaoEntrega(id: string) {
    if (!editEnderecoEntrega) return
    setSalvandoEntregaId(id)
    setEditandoEntrega(null)
    const res = await fetch('/api/admin/editar-entrega', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, endereco_destino: editEnderecoEntrega }),
    })
    const data = await res.json()
    if (!data.error) {
      setEntregas(prev => prev.map(e => e.id === id
        ? { ...e, endereco_destino: data.endereco_destino, km_calculado: data.km_calculado, valor_km: data.valor_km }
        : e))
      setTodasEntregasState(prev => prev.map(e => e.id === id
        ? { ...e, endereco_destino: data.endereco_destino, km_calculado: data.km_calculado, valor_km: data.valor_km }
        : e))
    }
    setSalvandoEntregaId(null)
  }

  async function excluirEntrega(e: Entrega) {
    const id = e.id
    const identificacao = e.tipo === 'ifood' && e.codigo_ifood
      ? `iFood #${e.codigo_ifood}`
      : e.endereco_destino
    if (!confirm(`Excluir esta entrega?\n\n${identificacao}\n\nEssa ação não pode ser desfeita.`)) return
    setExcluindoEntregaId(id)
    const res = await fetch('/api/admin/excluir-entrega', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!data.error) {
      setEntregas(prev => prev.filter(e => e.id !== id))
      setTodasEntregasState(prev => prev.filter(e => e.id !== id))
    }
    setExcluindoEntregaId(null)
  }

  async function toggleMotoboy(id: string, ativo: boolean) {
    await supabase.from('profiles').update({ ativo }).eq('id', id)
    setMotoboys(prev => prev.map(m => m.id === id ? { ...m, ativo } : m))
    // Ao reativar, recarrega entregas para garantir que só apareçam as de hoje
    if (ativo) await recarregar()
  }

  async function salvarEdicaoMotoboy(id: string) {
    setSalvandoEdicaoMotoboy(true)
    const diaria = parseFloat(editMotoboyDiaria) || 0
    await supabase.from('profiles').update({
      nome: editMotoboyNome,
      tipo: editMotoboyTipo,
      valor_diaria: diaria,
    }).eq('id', id)
    setMotoboys(prev => prev.map(m => m.id === id
      ? { ...m, nome: editMotoboyNome, tipo: editMotoboyTipo, valor_diaria: diaria }
      : m))
    setSalvandoEdicaoMotoboy(false)
    setEditandoMotoboy(null)
  }

  async function criarMotoboy() {
    if (!novoNome || !novoEmail || !novaSenha) return
    setSalvandoMotoboy(true); setErroMotoboy('')
    const res = await fetch('/api/admin/criar-motoboy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, email: novoEmail, senha: novaSenha, tipo: novoTipo }),
    })
    const data = await res.json()
    if (data.error) { setErroMotoboy(data.error); setSalvandoMotoboy(false); return }
    setMotoboys(prev => [...prev, data])
    setNovoNome(''); setNovoEmail(''); setNovaSenha('')
    setSalvandoMotoboy(false)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/login') }

  const quinzenaSelecionada: Quinzena = getQuinzenaComOffset(quinzenaOffset)

  const carregarQuinzena = useCallback(async (q: Quinzena) => {
    setQuinzenaCarregando(true)
    setQuinzenaEntregas([])
    const res = await fetch(`/api/quinzena?inicio=${q.inicio.toISOString()}&fim=${q.fim.toISOString()}`)
    const json = await res.json()
    setQuinzenaEntregas(json.entregas || [])
    setQuinzenaCarregando(false)
  }, [])

  async function cruzarPlanilha() {
    if (!quinzenaArquivo) return
    setQuinzenaEnviando(true)
    const fd = new FormData()
    fd.append('arquivo', quinzenaArquivo)
    fd.append('inicio', quinzenaSelecionada.inicio.toISOString())
    fd.append('fim', quinzenaSelecionada.fim.toISOString())
    fd.append('label', quinzenaSelecionada.label)
    fd.append('acao', 'cruzar')
    const res = await fetch('/api/quinzena', { method: 'POST', body: fd })
    const json = await res.json()
    setQuinzenaCruzamento(json.cruzamento)
    setQuinzenaEnviando(false)
  }

  async function enviarRelatorios() {
    setQuinzenaEnviando(true)
    const fd = new FormData()
    fd.append('inicio', quinzenaSelecionada.inicio.toISOString())
    fd.append('fim', quinzenaSelecionada.fim.toISOString())
    fd.append('label', quinzenaSelecionada.label)
    fd.append('acao', 'enviar')
    await fetch('/api/quinzena', { method: 'POST', body: fd })
    setQuinzenaEnviado(true)
    setQuinzenaEnviando(false)
  }

  async function testarEmail() {
    setTestEmailStatus('sending')
    const res = await fetch('/api/email/teste', { method: 'POST' })
    setTestEmailStatus(res.ok ? 'ok' : 'error')
    setTimeout(() => setTestEmailStatus('idle'), 4000)
  }

  function mudarQuinzena(novoOffset: number) {
    setQuinzenaOffset(novoOffset)
    setQuinzenaEntregas([])
    setQuinzenaCruzamento(null)
    setQuinzenaArquivo(null)
    setQuinzenaEnviado(false)
  }

  const porMotoboy = motoboys.map(m => {
    const ent = entregas.filter(e => e.motoboy_id === m.id)
    return { ...m, entregas: ent, totalKm: ent.reduce((s, e) => s + (e.km_calculado || 0), 0), totalValor: ent.reduce((s, e) => s + e.valor_km, 0), diaria: m.valor_diaria || 30 }
  })

  const porDia = todasEntregasState.reduce((acc, e) => {
    const dia = formatarDiaBrasilia(e.created_at)
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e)
    return acc
  }, {} as Record<string, Entrega[]>)

  // Relatório semanal
  const inicioSemana = getInicioSemana(semanaOffset)
  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(inicioSemana.getDate() + 6)
  fimSemana.setHours(23, 59, 59, 999)

  const entregasSemana = todasEntregasState.filter(e => {
    const d = new Date(e.created_at)
    return d >= inicioSemana && d <= fimSemana
  })

  // Dias únicos no período
  const diasSemana = [...new Set(entregasSemana.map(e => formatarDiaBrasilia(e.created_at)))].length

  const relatorioMotoboys = motoboys.map(m => {
    const ents = entregasSemana.filter(e => e.motoboy_id === m.id)
    const diasManha = contarDiasAtivosPorTurno(ents, 'manha')
    const diasNoite = contarDiasAtivosPorTurno(ents, 'noite')
    const diasAtivos = diasManha + diasNoite
    const totalKmM = ents.reduce((s, e) => s + (e.km_calculado || 0), 0)
    const totalCorridas = ents.reduce((s, e) => s + e.valor_km, 0)
    const diariaManha = m.tipo === 'fixo' ? DIARIA_MANHA_FIXO : DIARIA_MANHA_AVULSO
    const totalDiarias = diasManha * diariaManha + diasNoite * DIARIA_NOITE
    return { ...m, ents, diasAtivos, diasManha, diasNoite, diariaManha, totalKmM, totalCorridas, totalDiarias, totalAPagar: totalCorridas + totalDiarias }
  }).filter(m => m.ents.length > 0)

  const totalGeralSemana = relatorioMotoboys.reduce((s, m) => s + m.totalAPagar, 0)

  const labelSemana = semanaOffset === 0 ? 'Semana atual' : semanaOffset === -1 ? 'Semana passada' : `Semana ${semanaOffset}`

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="bg-[#1C1C1C] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F7941D] rounded-lg flex items-center justify-center text-lg">🥕</div>
          <div>
            <div className="font-bold text-sm leading-tight">ALL NATURAL</div>
            <div className="text-gray-400 text-xs">Admin · {profile.nome.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={sair} className="p-2 rounded-full hover:bg-gray-700"><LogOut size={18} /></button>
      </header>

      {/* Stats */}
      <div className="bg-[#1C1C1C] px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-400">Entregas</p>
            <p className="text-2xl font-bold">{entregas.length}</p>
            <p className="text-xs text-gray-500">{totalKm.toFixed(1)} km</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setPopupMotoboys(v => !v)}
              className="bg-white/10 rounded-xl p-3 text-white w-full text-left active:bg-white/20 transition-colors"
            >
              <p className="text-xs text-gray-400">Motoboys</p>
              <p className="text-2xl font-bold">{motoboys.filter(m => m.ativo !== false).length}</p>
              <p className="text-xs text-gray-500">ativos agora ▾</p>
            </button>
            {popupMotoboys && (
              <>
                {/* overlay transparente para fechar */}
                <div className="fixed inset-0 z-10" onClick={() => setPopupMotoboys(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 min-w-[160px] py-2 overflow-hidden">
                  {motoboys.filter(m => m.ativo !== false).length === 0 && (
                    <p className="text-xs text-gray-400 px-4 py-2">Nenhum ativo</p>
                  )}
                  {motoboys.filter(m => m.ativo !== false).map(m => (
                    <div key={m.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                      <span className="text-base">🛵</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{m.nome}</p>
                        <p className="text-xs text-gray-400">{m.tipo === 'fixo' ? 'Fixo' : 'Avulso'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-400">Custo</p>
            <p className="text-xl font-bold text-[#F7941D]">{formatarValor(totalValorCorridas + totalDiarias)}</p>
            <p className="text-xs text-gray-500">corridas+diárias</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 shadow-sm overflow-x-auto">
        {[
          { key: 'entregas', icon: <BarChart3 size={13} />, label: 'Hoje' },
          { key: 'historico', icon: <Calendar size={13} />, label: 'Histórico' },
          { key: 'relatorio', icon: <FileText size={13} />, label: 'Relatório' },
          { key: 'quinzena', icon: <Calendar size={13} />, label: 'Quinzena' },
          { key: 'motoboys', icon: <Users size={13} />, label: 'Motoboys' },
          { key: 'enderecos', icon: <MapPin size={13} />, label: 'Endereços' },
          { key: 'assinatura', icon: <CreditCard size={13} />, label: 'Assinatura' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setAba(tab.key as typeof aba)}
            className={`flex-shrink-0 px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors ${aba === tab.key ? 'border-[#F7941D] text-[#F7941D]' : 'border-transparent text-gray-400'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* ABA HOJE */}
        {aba === 'entregas' && (
          <div className="space-y-3">
            {/* Banner próximo pagamento */}
            {(() => { const p = getProximoPagamento(); return (
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Próximo pagamento</p>
                  <p className="text-sm font-bold text-gray-800">{p.dataFmt} <span className="font-normal text-gray-400">({p.semanaFmt})</span></p>
                </div>
                <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${p.dias <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                  {p.dias === 0 ? 'hoje' : p.dias === 1 ? 'amanhã' : `em ${p.dias} dias`}
                </div>
              </div>
            )})()}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Entregas de hoje</h2>
              <button onClick={recarregar} disabled={carregando} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} /> Atualizar
              </button>
            </div>
            {porMotoboy.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div><p className="font-semibold text-gray-800">🛵 {m.nome}</p><p className="text-xs text-gray-400">{m.tipo} · {m.entregas.length} entregas · {m.totalKm.toFixed(1)} km</p></div>
                  <div className="text-right"><p className="font-bold text-[#F7941D]">{formatarValor(m.totalValor + m.diaria)}</p><p className="text-xs text-gray-400">diária + corridas</p></div>
                </div>
                {m.entregas.length === 0 ? <p className="text-xs text-gray-400 italic">Nenhuma entrega ainda</p> : (
                  <div className="space-y-1">
                    {m.entregas.slice(0, 5).map(e => (
                      editandoEntrega === e.id ? (
                        <div key={e.id} className="flex items-center gap-1 py-1">
                          <input type="text" value={editEnderecoEntrega} onChange={ev => setEditEnderecoEntrega(ev.target.value)}
                            className="flex-1 border border-[#F7941D] rounded-lg px-2 py-1 text-xs focus:outline-none bg-orange-50" />
                          <button onClick={() => salvarEdicaoEntrega(e.id)} className="text-green-600 shrink-0"><Check size={16} /></button>
                          <button onClick={() => setEditandoEntrega(null)} className="text-gray-400 shrink-0"><X size={16} /></button>
                        </div>
                      ) : (
                        <div key={e.id} className="flex items-center justify-between text-xs group">
                          <span className="text-gray-500 truncate flex-1 mr-2">{e.tipo === 'ifood' ? '🛍️' : '📦'} {e.endereco_destino}</span>
                          <button onClick={() => iniciarEdicaoEntrega(e)} className="text-gray-300 hover:text-[#F7941D] shrink-0 mr-2"><Pencil size={12} /></button>
                          <button onClick={() => excluirEntrega(e)} disabled={excluindoEntregaId === e.id} className="text-gray-300 hover:text-red-500 shrink-0 mr-2"><Trash2 size={12} /></button>
                          {salvandoEntregaId === e.id || excluindoEntregaId === e.id ? (
                            <span className="text-gray-400 shrink-0 italic">{excluindoEntregaId === e.id ? 'excluindo...' : 'recalculando...'}</span>
                          ) : (
                            <span className="text-gray-700 font-medium shrink-0">{e.km_calculado ? `${e.km_calculado}km · ` : ''}{formatarValor(e.valor_km)}</span>
                          )}
                        </div>
                      )
                    ))}
                    {m.entregas.length > 5 && <p className="text-xs text-gray-400">+{m.entregas.length - 5} mais...</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {aba === 'historico' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Histórico completo</h2>
            {Object.entries(porDia).map(([dia, ents]) => {
              const totalDiaValor = ents.reduce((s, e) => s + e.valor_km, 0)
              const totalDiaKm = ents.reduce((s, e) => s + (e.km_calculado || 0), 0)
              const porMotoboyDia = motoboys.map(m => {
                const entsMotoboy = ents.filter(e => e.motoboy_id === m.id)
                const temManha = entsMotoboy.some(e => getTurno(new Date(e.created_at)) === 'manha')
                const temNoite = entsMotoboy.some(e => getTurno(new Date(e.created_at)) === 'noite')
                const diariaManha = m.tipo === 'fixo' ? DIARIA_MANHA_FIXO : DIARIA_MANHA_AVULSO
                const totalDiarias = (temManha ? diariaManha : 0) + (temNoite ? DIARIA_NOITE : 0)
                const total = entsMotoboy.reduce((s, e) => s + e.valor_km, 0)
                return { ...m, ents: entsMotoboy, total, totalDiarias, temManha, temNoite }
              }).filter(m => m.ents.length > 0)

              return (
                <div key={dia} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
                    <span className="font-semibold text-gray-800">📅 {dia}</span>
                    <span className="text-sm text-gray-500">{ents.length} entregas · {totalDiaKm.toFixed(1)} km · {formatarValor(totalDiaValor)}</span>
                  </div>
                  {porMotoboyDia.map(m => (
                    <div key={m.id} className="border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between px-4 py-2 bg-white">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">🛵 {m.nome} ({m.ents.length}x)</span>
                          <span className="text-xs text-gray-400 block">
                            {m.temManha && m.temNoite ? '🌅 manhã + 🌙 noite' : m.temManha ? '🌅 manhã' : '🌙 noite'}
                            {' · diária '}{formatarValor(m.totalDiarias)}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#F7941D]">{formatarValor(m.total + m.totalDiarias)}</span>
                      </div>
                      <div className="px-4 pb-2 space-y-1">
                        {m.ents.map(e => (
                          <div key={e.id} className="flex items-center justify-between text-xs group">
                            <span className="text-gray-500 truncate flex-1 mr-2">{e.tipo === 'ifood' ? '🛍️' : '📦'} {e.endereco_destino}</span>
                            <button onClick={() => excluirEntrega(e)} disabled={excluindoEntregaId === e.id} className="text-gray-300 hover:text-red-500 shrink-0 mr-2"><Trash2 size={12} /></button>
                            <span className="text-gray-600 shrink-0">{excluindoEntregaId === e.id ? 'excluindo...' : `${e.km_calculado ? `${e.km_calculado}km · ` : ''}${formatarValor(e.valor_km)} · ${formatarDataBrasilia(e.created_at)}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
            {todasEntregasState.length === 0 && (
              <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">📭</span>Nenhuma entrega registrada</div>
            )}
          </div>
        )}

        {/* ABA RELATÓRIO */}
        {aba === 'relatorio' && (
          <div className="space-y-4">
            {/* Seletor de semana */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setSemanaOffset(s => s - 1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">←</button>
                <div className="text-center">
                  <p className="font-bold text-gray-800">{labelSemana}</p>
                  <p className="text-xs text-gray-400">
                    {inicioSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – {fimSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => setSemanaOffset(s => Math.min(s + 1, 0))} disabled={semanaOffset === 0}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 disabled:opacity-30">→</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-orange-50 rounded-xl p-2">
                  <p className="text-gray-500">Entregas</p>
                  <p className="font-bold text-lg text-[#F7941D]">{entregasSemana.length}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-2">
                  <p className="text-gray-500">Dias</p>
                  <p className="font-bold text-lg text-[#F7941D]">{diasSemana}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-2">
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold text-lg text-[#F7941D]">{formatarValor(totalGeralSemana).replace('R$ ', '')}</p>
                </div>
              </div>
            </div>

            {relatorioMotoboys.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">📭</span>Sem entregas neste período</div>
            ) : (
              <>
                {relatorioMotoboys.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900">🛵 {m.nome}</p>
                        <p className="text-xs text-gray-400">{m.ents.length} entregas · {m.diasAtivos} dias · {m.totalKmM.toFixed(1)} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-[#F7941D]">{formatarValor(m.totalAPagar)}</p>
                        <p className="text-xs text-gray-400">a pagar</p>
                      </div>
                    </div>
                    <div className="space-y-1 border-t border-gray-50 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Corridas ({m.ents.length}x)</span>
                        <span className="font-medium">{formatarValor(m.totalCorridas)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Diárias
                          {m.diasManha > 0 && ` (${m.diasManha}x manhã × ${formatarValor(m.diariaManha)}`}
                          {m.diasManha > 0 && m.diasNoite > 0 && ' + '}
                          {m.diasNoite > 0 && `${m.diasManha === 0 ? ' (' : ''}${m.diasNoite}x noite × ${formatarValor(DIARIA_NOITE)}`}
                          {(m.diasManha > 0 || m.diasNoite > 0) && ')'}
                        </span>
                        <span className="font-medium">{formatarValor(m.totalDiarias)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total geral */}
                <div className="bg-[#1C1C1C] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Total geral da semana</p>
                      <p className="text-xs text-gray-400">{relatorioMotoboys.length} motoboys · {entregasSemana.length} entregas</p>
                    </div>
                    <p className="text-2xl font-black text-[#F7941D]">{formatarValor(totalGeralSemana)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ABA QUINZENA */}
        {aba === 'quinzena' && (
          <div className="space-y-4">

            {/* Navegação de períodos */}
            <div className="bg-[#1C1C1C] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => mudarQuinzena(quinzenaOffset - 1)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">←</button>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">{quinzenaSelecionada.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{formatarPeriodo(quinzenaSelecionada)}</p>
                  {quinzenaOffset === 0 && <span className="text-[10px] bg-[#F7941D] text-white px-2 py-0.5 rounded-full mt-1 inline-block">Atual</span>}
                </div>
                <button onClick={() => mudarQuinzena(quinzenaOffset + 1)} disabled={quinzenaOffset >= 0}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20">→</button>
              </div>
            </div>

            {/* Preview do relatório */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Preview do relatório</h3>
                <button onClick={() => carregarQuinzena(quinzenaSelecionada)} disabled={quinzenaCarregando}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                  <RefreshCw size={12} className={quinzenaCarregando ? 'animate-spin' : ''} /> Carregar
                </button>
              </div>
              {quinzenaCarregando ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Carregando...</p>
              ) : quinzenaEntregas.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Clique em Carregar para ver o resumo do período</p>
              ) : (() => {
                const { linhas, totalGeral } = gerarRelatorio(quinzenaSelecionada, motoboys, quinzenaEntregas, 'motoboy')
                if (linhas.length === 0) return <p className="text-xs text-gray-400 italic text-center py-4">Nenhuma entrega neste período</p>
                return (
                  <div className="space-y-2">
                    {linhas.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">🛵 {m.nome}</p>
                          <p className="text-xs text-gray-400">{m.entregas} entregas · {m.diasAtivos} dias · diária R${m.diaria}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#F7941D]">{formatarValor(m.totalAPagar)}</p>
                          <p className="text-xs text-gray-400">corridas + diárias</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-orange-100">
                      <p className="font-bold text-gray-800 text-sm">Total geral</p>
                      <p className="font-black text-[#F7941D] text-lg">{formatarValor(totalGeral)}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Upload planilha iFood */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2"><Upload size={15} /> Cruzamento iFood</h3>
              <p className="text-xs text-gray-400 mb-3">Baixe o relatório de pedidos do iFood e faça o upload para conferir se os números batem com o sistema.</p>

              <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${quinzenaArquivo ? 'border-[#F7941D] bg-orange-50' : 'border-gray-200 hover:border-[#F7941D]'}`}>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => { setQuinzenaArquivo(e.target.files?.[0] || null); setQuinzenaCruzamento(null) }} />
                <Upload size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500 truncate max-w-[200px]">{quinzenaArquivo ? quinzenaArquivo.name : 'Selecionar planilha (.xlsx ou .csv)'}</span>
              </label>

              {quinzenaArquivo && (
                <button onClick={cruzarPlanilha} disabled={quinzenaEnviando}
                  className="w-full mt-3 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
                  {quinzenaEnviando ? 'Analisando...' : 'Cruzar planilha'}
                </button>
              )}

              {/* Resultado do cruzamento */}
              {quinzenaCruzamento && (
                <div className={`mt-3 rounded-xl p-3 flex items-start gap-3 ${quinzenaCruzamento.ok ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  {quinzenaCruzamento.ok
                    ? <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                    : <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-sm font-semibold ${quinzenaCruzamento.ok ? 'text-green-700' : 'text-amber-700'}`}>
                      {quinzenaCruzamento.ok ? 'Números conferem! ✅' : 'Divergência ⚠️ — confira antes de enviar'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sistema: <strong>{quinzenaCruzamento.totalSistema}</strong> pedidos iFood · Planilha: <strong>{quinzenaCruzamento.totalIfood}</strong> pedidos
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botão fechar e enviar */}
            {quinzenaEnviado ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <CheckCircle2 size={24} className="text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-700">Relatórios enviados!</p>
                <p className="text-xs text-gray-500 mt-1">Dois emails enviados para allnatural.cwb@gmail.com</p>
                <button onClick={() => setQuinzenaEnviado(false)} className="mt-3 text-xs text-gray-400 underline">Enviar novamente</button>
              </div>
            ) : (
              <button onClick={enviarRelatorios} disabled={quinzenaEnviando}
                className="w-full bg-[#F7941D] hover:bg-[#e07a0a] disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-2xl font-bold text-base transition-colors shadow-sm active:scale-95">
                {quinzenaEnviando ? 'Enviando relatórios...' : '📧 Fechar quinzena e enviar relatórios'}
              </button>
            )}

            {/* Testar configuração de email */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-1 text-sm">Testar configuração de email</h3>
              <p className="text-xs text-gray-400 mb-3">Envia um email de teste para verificar se o Gmail está configurado corretamente.</p>
              <button onClick={testarEmail} disabled={testEmailStatus === 'sending'}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors
                  ${testEmailStatus === 'ok' ? 'bg-green-100 text-green-700' :
                    testEmailStatus === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                {testEmailStatus === 'sending' ? 'Enviando...' :
                 testEmailStatus === 'ok' ? '✅ Email enviado com sucesso!' :
                 testEmailStatus === 'error' ? '❌ Erro — verifique a senha de app' :
                 '📨 Enviar email de teste'}
              </button>
            </div>

          </div>
        )}

        {/* ABA MOTOBOYS */}
        {aba === 'motoboys' && (
          <div className="space-y-4">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
              <strong>Ativo</strong> = rodando hoje · <strong>Pausado</strong> = na base mas fora de operação<br />
              A escala de cada turno é definida no quiosque (aparece toda a base).
            </div>

            {/* Lista unificada */}
            <div className="space-y-2">
              {[...motoboys].sort((a, b) => (a.ativo === false ? 1 : -1) - (b.ativo === false ? 1 : -1)).map(m => {
                const pausado = m.ativo === false
                return (
                  <div key={m.id} className={`bg-white rounded-2xl p-4 shadow-sm transition-opacity ${pausado && editandoMotoboy !== m.id ? 'opacity-50' : ''}`}>
                    {editandoMotoboy === m.id ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editando</p>
                        <input type="text" value={editMotoboyNome} onChange={e => setEditMotoboyNome(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                          placeholder="Nome" />
                        <div className="flex gap-2">
                          <button onClick={() => setEditMotoboyTipo('fixo')}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${editMotoboyTipo === 'fixo' ? 'bg-[#F7941D] text-white border-[#F7941D]' : 'bg-white text-gray-600 border-gray-200'}`}>
                            Fixo
                          </button>
                          <button onClick={() => setEditMotoboyTipo('avulso')}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${editMotoboyTipo === 'avulso' ? 'bg-[#F7941D] text-white border-[#F7941D]' : 'bg-white text-gray-600 border-gray-200'}`}>
                            Avulso
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 ml-1">Diária (R$)</label>
                          <input type="number" value={editMotoboyDiaria} onChange={e => setEditMotoboyDiaria(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => salvarEdicaoMotoboy(m.id)} disabled={salvandoEdicaoMotoboy}
                            className="flex-1 py-2 bg-[#F7941D] text-white rounded-xl text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50">
                            {salvandoEdicaoMotoboy ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditandoMotoboy(null)}
                            className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold active:scale-95 transition-transform">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">🛵 {m.nome}</p>
                          <p className="text-xs text-gray-400">{m.tipo} · {formatarValor(m.valor_diaria || 30)}/dia</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => { setEditandoMotoboy(m.id); setEditMotoboyNome(m.nome); setEditMotoboyTipo(m.tipo as 'fixo' | 'avulso'); setEditMotoboyDiaria(String(m.valor_diaria || 30)) }}
                            className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-xl font-semibold active:scale-95 transition-transform">
                            ✏️
                          </button>
                          {pausado ? (
                            <>
                              <button onClick={() => toggleMotoboy(m.id, true)}
                                className="text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-xl font-semibold active:scale-95 transition-transform">
                                Ativar
                              </button>
                              {m.tipo === 'avulso' && (
                                <button onClick={async () => {
                                  if (!confirm(`Apagar ${m.nome} da base? Esta ação não pode ser desfeita.`)) return
                                  await supabase.from('profiles').delete().eq('id', m.id)
                                  setMotoboys(prev => prev.filter(x => x.id !== m.id))
                                }}
                                  className="text-xs bg-red-50 text-red-500 border border-red-200 px-2.5 py-1.5 rounded-xl font-semibold active:scale-95 transition-transform">
                                  🗑
                                </button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => toggleMotoboy(m.id, false)}
                              className="text-xs bg-orange-50 text-orange-500 border border-orange-200 px-3 py-1.5 rounded-xl font-semibold active:scale-95 transition-transform">
                              Pausar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Formulário novo motoboy - simplificado */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} /> Novo motoboy</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setNovoTipo('fixo')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${novoTipo === 'fixo' ? 'bg-[#F7941D] text-white border-[#F7941D]' : 'bg-white text-gray-600 border-gray-200'}`}>
                    Fixo · R$40/dia
                  </button>
                  <button onClick={() => setNovoTipo('avulso')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${novoTipo === 'avulso' ? 'bg-[#F7941D] text-white border-[#F7941D]' : 'bg-white text-gray-600 border-gray-200'}`}>
                    Avulso · R$30/dia
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Nome completo</label>
                  <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                    placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Email</label>
                  <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                    placeholder="Ex: joao@allnatural.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Senha inicial</label>
                  <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50"
                    placeholder="Padrão: 123456" />
                </div>
                {erroMotoboy && <p className="text-red-600 text-xs">{erroMotoboy}</p>}
                <button onClick={criarMotoboy} disabled={salvandoMotoboy || !novoNome || !novoEmail || !novaSenha}
                  className="w-full bg-[#F7941D] hover:bg-[#e07a0a] disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {salvandoMotoboy ? 'Criando...' : '+ Adicionar motoboy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA ENDEREÇOS */}
        {aba === 'enderecos' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {enderecos.map(e => (
                <div key={e.id} className={`bg-white rounded-2xl p-4 shadow-sm ${!e.ativo ? 'opacity-40' : ''}`}>
                  {editandoEnd === e.id ? (
                    // Modo edição inline
                    <div className="space-y-2">
                      <input type="text" value={editNome} onChange={ev => setEditNome(ev.target.value)}
                        className="w-full border border-[#F7941D] rounded-xl px-3 py-2 text-sm focus:outline-none bg-orange-50 font-semibold" />
                      <AutocompleteInput value={editCompleto} onChange={setEditCompleto}
                        className="w-full border border-[#F7941D] rounded-xl px-3 py-2 text-sm focus:outline-none bg-orange-50" />
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => salvarEdicao(e.id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-[#F7941D] text-white py-2 rounded-xl text-sm font-semibold">
                          <Check size={14} /> Salvar
                        </button>
                        <button onClick={() => setEditandoEnd(null)}
                          className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-semibold">
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo visualização
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        <p className="font-semibold text-gray-800">{e.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{e.endereco_completo}</p>
                      </div>
                      {e.ativo && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => iniciarEdicao(e)} className="p-2 text-gray-400 hover:text-[#F7941D]"><Pencil size={15} /></button>
                          <button onClick={() => removerEndereco(e.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} /> Novo endereço favorito</h3>
              <div className="space-y-3">
                <input type="text" value={novoEndNome} onChange={e => setNovoEndNome(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" placeholder="Nome (ex: Loja da Thaty)" />
                <AutocompleteInput value={novoEndCompleto} onChange={setNovoEndCompleto} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" placeholder="Endereço completo com bairro e cidade" />
                <button onClick={adicionarEndereco} disabled={salvandoEnd || !novoEndNome || !novoEndCompleto}
                  className="w-full bg-[#F7941D] hover:bg-[#e07a0a] disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {salvandoEnd ? 'Salvando...' : 'Adicionar endereço'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA ASSINATURA */}
        {aba === 'assinatura' && (
          <div className="space-y-4">

            {/* Card: Gerar Cobrança */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CreditCard size={16} className="text-[#F7941D]" /> Gerar cobrança Asaas
              </h3>
              <div className="space-y-2">
                <input value={assNome} onChange={e => setAssNome(e.target.value)}
                  placeholder="Nome do cliente" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />
                <input value={assCpfCnpj} onChange={e => setAssCpfCnpj(e.target.value)}
                  placeholder="CPF ou CNPJ (só números)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />
                <input value={assEmail} onChange={e => setAssEmail(e.target.value)}
                  placeholder="E-mail (opcional)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />
                <input value={assTelefone} onChange={e => setAssTelefone(e.target.value)}
                  placeholder="WhatsApp (opcional)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 ml-1">Implantação (R$)</label>
                    <input value={assValorImpl} onChange={e => setAssValorImpl(e.target.value)} type="number"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 ml-1">Mensalidade (R$)</label>
                    <input value={assValorMens} onChange={e => setAssValorMens(e.target.value)} type="number"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />
                  </div>
                </div>

                {assErro && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 flex items-center gap-2">
                    <AlertTriangle size={13} /> {assErro}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    disabled={assLoading || !assNome || !assCpfCnpj}
                    onClick={async () => {
                      setAssLoading(true); setAssErro(''); setAssResultado(null)
                      try {
                        const r = await fetch('/api/asaas/cobranca', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tipo: 'implantacao', nome: assNome, cpfCnpj: assCpfCnpj, email: assEmail, telefone: assTelefone, plano: assPlano, valorCustom: parseFloat(assValorImpl), descricaoCustom: 'Rota Simples — Implantação 3 unidades' }) })
                        const data = await r.json()
                        if (!r.ok) throw new Error(data.error)
                        setAssResultado(data)
                      } catch(e: unknown) { setAssErro(e instanceof Error ? e.message : 'Erro') }
                      finally { setAssLoading(false) }
                    }}
                    className="bg-[#F7941D] hover:bg-[#e07a0a] disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                    {assLoading ? 'Gerando...' : 'Cobrar implantação'}
                  </button>
                  <button
                    disabled={assLoading || !assNome || !assCpfCnpj}
                    onClick={async () => {
                      setAssLoading(true); setAssErro(''); setAssResultado(null)
                      try {
                        const r = await fetch('/api/asaas/cobranca', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tipo: 'mensalidade', nome: assNome, cpfCnpj: assCpfCnpj, email: assEmail, telefone: assTelefone, plano: assPlano, valorCustom: parseFloat(assValorMens), descricaoCustom: 'Rota Simples — Mensalidade 3 unidades' }) })
                        const data = await r.json()
                        if (!r.ok) throw new Error(data.error)
                        setAssResultado(data)
                      } catch(e: unknown) { setAssErro(e instanceof Error ? e.message : 'Erro') }
                      finally { setAssLoading(false) }
                    }}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                    {assLoading ? 'Gerando...' : 'Criar mensalidade'}
                  </button>
                </div>
              </div>

              {/* Resultado da cobrança gerada */}
              {assResultado && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                    <CheckCircle2 size={16} /> Cobrança gerada com sucesso!
                  </div>
                  {(assResultado.links as Record<string, string>)?.pixCopiaECola && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Pix Copia e Cola:</p>
                      <div className="bg-white border rounded-lg p-2 text-xs font-mono break-all text-gray-700 select-all">
                        {(assResultado.links as Record<string, string>).pixCopiaECola}
                      </div>
                    </div>
                  )}
                  {(assResultado.links as Record<string, string>)?.invoiceUrl && (
                    <a href={(assResultado.links as Record<string, string>).invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#F7941D] text-sm font-semibold">
                      <ExternalLink size={14} /> Abrir fatura no Asaas
                    </a>
                  )}
                  {(assResultado.assinatura as Record<string, unknown>) && (
                    <p className="text-xs text-green-700">Assinatura mensal criada! ID: {(assResultado.assinatura as Record<string, string>).id}</p>
                  )}
                </div>
              )}
            </div>

            {/* Card: Consultar status */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-[#F7941D]" /> Consultar cliente
              </h3>
              <div className="flex gap-2">
                <input value={assCpfCnpj} onChange={e => setAssCpfCnpj(e.target.value)}
                  placeholder="CPF ou CNPJ" className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] bg-gray-50" />
                <button
                  disabled={assStatusLoading || !assCpfCnpj}
                  onClick={async () => {
                    setAssStatusLoading(true)
                    const r = await fetch(`/api/asaas/status?cpfCnpj=${assCpfCnpj}`)
                    const data = await r.json()
                    setAssStatusData(data)
                    setAssStatusLoading(false)
                  }}
                  className="bg-[#F7941D] text-white px-4 rounded-xl text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400">
                  {assStatusLoading ? '...' : 'Buscar'}
                </button>
              </div>
              {assStatusData && (
                <div className="mt-3 space-y-2">
                  {!assStatusData.cliente && <p className="text-sm text-gray-400">Cliente não encontrado no Asaas.</p>}
                  {!!assStatusData.cliente && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                      <p className="font-semibold">{(assStatusData.cliente as Record<string, string>).name}</p>
                      <p className="text-gray-400">ID: {(assStatusData.cliente as Record<string, string>).id}</p>
                    </div>
                  )}
                  {Array.isArray(assStatusData.cobrancas) && assStatusData.cobrancas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Cobranças</p>
                      {(assStatusData.cobrancas as Array<Record<string, unknown>>).map((c) => (
                        <div key={c.id as string} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-xs mb-1">
                          <span className="text-gray-700">{c.description as string}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">R$ {c.value as number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status === 'RECEIVED' || c.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : c.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {c.status === 'RECEIVED' || c.status === 'CONFIRMED' ? 'Pago' : c.status === 'OVERDUE' ? 'Vencida' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
