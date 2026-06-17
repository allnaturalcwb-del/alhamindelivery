const fs = require('fs')
const path = require('path')

function write(filePath, content) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✅ ' + filePath)
}

// .env.local
write('.env.local', `NEXT_PUBLIC_SUPABASE_URL=https://qompkkvdtpyvdppcygwn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvbXBra3ZkdHB5dmRwcGN5Z3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDg3OTcsImV4cCI6MjA5NjM4NDc5N30.Vk9duonPokhOQdC-yE3t0tV5byfNNKxW89OgEFCWfdA
GOOGLE_MAPS_API_KEY=
`)

// src/lib/supabase/client.ts
write('src/lib/supabase/client.ts', `import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
`)

// src/lib/supabase/server.ts
write('src/lib/supabase/server.ts', `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
`)

// src/lib/km.ts
write('src/lib/km.ts', `export const ORIGEM = 'Av. Silva Jardim 2424, Batel, Curitiba, PR, Brazil'

export function calcularValorPorKm(km: number): number {
  if (km <= 3) return 6
  if (km <= 5) return 8
  if (km <= 7) return 10
  if (km <= 10) return 13
  if (km <= 13) return 16
  return 18
}

export function formatarValor(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
`)

// src/middleware.ts
write('src/middleware.ts', `import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
`)

// src/app/layout.tsx
write('src/app/layout.tsx', `import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'All Natural Delivery',
  description: 'Controle de entregas All Natural',
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={\`\${geist.className} bg-gray-50 min-h-screen\`}>
        {children}
      </body>
    </html>
  )
}
`)

// src/app/page.tsx
write('src/app/page.tsx', `import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }
`)

// src/app/login/page.tsx
write('src/app/login/page.tsx', `'use client'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-700 to-green-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛵</div>
          <h1 className="text-2xl font-bold text-white">All Natural</h1>
          <p className="text-green-200 text-sm mt-1">Controle de Entregas</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="seu@email.com" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{erro}</div>}
            <button type="submit" disabled={carregando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors">
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
`)

// src/app/dashboard/page.tsx
write('src/app/dashboard/page.tsx', `import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role === 'admin') redirect('/admin')

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { data: entregasHoje } = await supabase
    .from('entregas').select('*').eq('motoboy_id', user.id)
    .gte('created_at', hoje.toISOString()).order('created_at', { ascending: false })

  const { data: enderecosFav } = await supabase
    .from('enderecos_favoritos').select('*').eq('ativo', true).order('nome')

  return <DashboardClient profile={profile} entregasIniciais={entregasHoje || []} enderecosFavoritos={enderecosFav || []} />
}
`)

// src/app/dashboard/DashboardClient.tsx
write('src/app/dashboard/DashboardClient.tsx', `'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularValorPorKm, formatarValor } from '@/lib/km'
import { useRouter } from 'next/navigation'
import { LogOut, Plus, Clock, TrendingUp, Package } from 'lucide-react'

type Profile = { id: string; nome: string; tipo: string; role: string }
type Entrega = { id: string; tipo: string; codigo_ifood: string | null; endereco_destino: string; km_calculado: number | null; valor_km: number; created_at: string }
type EnderecoFav = { id: string; nome: string; endereco_completo: string }

interface Props { profile: Profile; entregasIniciais: Entrega[]; enderecosFavoritos: EnderecoFav[] }

export default function DashboardClient({ profile, entregasIniciais, enderecosFavoritos }: Props) {
  const [entregas, setEntregas] = useState<Entrega[]>(entregasIniciais)
  const [aba, setAba] = useState<'nova' | 'historico'>('nova')
  const [tipo, setTipo] = useState<'ifood' | 'por_fora'>('ifood')
  const [codigoIfood, setCodigoIfood] = useState('')
  const [enderecoSelecionado, setEnderecoSelecionado] = useState('')
  const [enderecoLivre, setEnderecoLivre] = useState('')
  const [usandoEnderecoLivre, setUsandoEnderecoLivre] = useState(false)
  const [km, setKm] = useState('')
  const [calculandoKm, setCalculandoKm] = useState(false)
  const [kmManual, setKmManual] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const enderecoAtual = usandoEnderecoLivre
    ? enderecoLivre
    : enderecosFavoritos.find(e => e.id === enderecoSelecionado)?.endereco_completo || ''

  const kmNum = parseFloat(km.replace(',', '.'))
  const valorCalculado = !isNaN(kmNum) && kmNum > 0 ? calcularValorPorKm(kmNum) : 0

  const calcularKmAuto = useCallback(async (endereco: string) => {
    if (!endereco) return
    setCalculandoKm(true); setKm('')
    try {
      const res = await fetch(\`/api/calcular-km?destino=\${encodeURIComponent(endereco)}\`)
      const data = await res.json()
      if (data.km) { setKm(String(data.km)); setKmManual(false) } else { setKmManual(true) }
    } catch { setKmManual(true) } finally { setCalculandoKm(false) }
  }, [])

  useEffect(() => { if (enderecoAtual) calcularKmAuto(enderecoAtual) }, [enderecoAtual, calcularKmAuto])

  async function salvarEntrega() {
    const enderecoFinal = tipo === 'ifood' ? \`Pedido iFood #\${codigoIfood}\` : enderecoAtual
    if (!enderecoFinal || !kmNum || kmNum <= 0) return
    setSalvando(true)
    const { data, error } = await supabase.from('entregas').insert({
      motoboy_id: profile.id, tipo,
      codigo_ifood: tipo === 'ifood' ? codigoIfood : null,
      endereco_destino: enderecoFinal, km_calculado: kmNum, valor_km: valorCalculado,
    }).select().single()
    if (!error && data) {
      setEntregas(prev => [data, ...prev]); setSucesso(true); setTimeout(() => setSucesso(false), 2000)
      setCodigoIfood(''); setEnderecoSelecionado(''); setEnderecoLivre(''); setKm(''); setKmManual(false)
    }
    setSalvando(false)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/login') }

  const totalKm = entregas.reduce((s, e) => s + (e.km_calculado || 0), 0)
  const totalValor = entregas.reduce((s, e) => s + e.valor_km, 0)
  const valorDiaria = profile.tipo === 'fixo' ? 45 : 35
  const totalDia = totalValor + valorDiaria
  const podeConfirmar = tipo === 'ifood' ? codigoIfood && kmNum > 0 : enderecoAtual && kmNum > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div>
          <div className="flex items-center gap-2"><span className="text-xl">🛵</span><span className="font-bold text-lg">{profile.nome}</span></div>
          <p className="text-green-200 text-xs mt-0.5">All Natural · Batel</p>
        </div>
        <button onClick={sair} className="p-2 rounded-full hover:bg-green-600"><LogOut size={18} /></button>
      </header>

      <div className="bg-green-700 px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-3 text-white text-center">
            <Package size={16} className="mx-auto mb-1 opacity-80" />
            <div className="text-xl font-bold">{entregas.length}</div>
            <div className="text-xs text-green-100">entregas</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-white text-center">
            <TrendingUp size={16} className="mx-auto mb-1 opacity-80" />
            <div className="text-xl font-bold">{totalKm.toFixed(1)}</div>
            <div className="text-xs text-green-100">km total</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-white text-center">
            <span className="text-base block mb-1">💰</span>
            <div className="text-xl font-bold">{formatarValor(totalDia).replace('R$\\u00a0', '')}</div>
            <div className="text-xs text-green-100">total dia</div>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b border-gray-200 sticky top-[72px] z-10">
        <button onClick={() => setAba('nova')} className={\`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors \${aba === 'nova' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'}\`}>
          <Plus size={16} /> Nova Entrega
        </button>
        <button onClick={() => setAba('historico')} className={\`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors \${aba === 'historico' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'}\`}>
          <Clock size={16} /> Hoje ({entregas.length})
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {aba === 'nova' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de entrega</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setTipo('ifood'); setKm(''); setKmManual(false) }}
                  className={\`py-3 rounded-xl font-semibold text-sm transition-all \${tipo === 'ifood' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}\`}>🛍️ iFood</button>
                <button onClick={() => { setTipo('por_fora'); setKm(''); setKmManual(false) }}
                  className={\`py-3 rounded-xl font-semibold text-sm transition-all \${tipo === 'por_fora' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}\`}>📦 Por Fora</button>
              </div>
            </div>

            {tipo === 'ifood' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código do pedido iFood</label>
                  <input type="text" value={codigoIfood} onChange={e => setCodigoIfood(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Ex: ABC-1234" />
                  <p className="text-xs text-gray-400 mt-1">Em breve: endereço buscado automaticamente 🚀</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Distância (km)</label>
                  <input type="number" value={km} onChange={e => setKm(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Ex: 4.5" step="0.1" min="0" />
                </div>
              </div>
            )}

            {tipo === 'por_fora' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Destino</label>
                {!usandoEnderecoLivre ? (
                  <>
                    <select value={enderecoSelecionado} onChange={e => setEnderecoSelecionado(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                      <option value="">Selecionar destino...</option>
                      {enderecosFavoritos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <button onClick={() => { setUsandoEnderecoLivre(true); setEnderecoSelecionado(''); setKm(''); setKmManual(false) }}
                      className="text-sm text-blue-600 font-medium">+ Digitar outro endereço</button>
                  </>
                ) : (
                  <>
                    <input type="text" value={enderecoLivre} onChange={e => setEnderecoLivre(e.target.value)}
                      onBlur={() => enderecoLivre && calcularKmAuto(enderecoLivre)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Ex: Rua XV de Novembro 123, Curitiba" />
                    <button onClick={() => { setUsandoEnderecoLivre(false); setEnderecoLivre(''); setKm(''); setKmManual(false) }}
                      className="text-sm text-blue-600 font-medium">← Usar destino salvo</button>
                  </>
                )}
                {calculandoKm && <div className="flex items-center gap-2 text-sm text-gray-500"><div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />Calculando km...</div>}
                {(kmManual || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) && enderecoAtual && !calculandoKm && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Distância (km)</label>
                    <input type="number" value={km} onChange={e => setKm(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Ex: 6.0" step="0.1" min="0" />
                    <p className="text-xs text-amber-600 mt-1">📍 Google Maps não configurado — informe o km manualmente</p>
                  </div>
                )}
                {!kmManual && km && !calculandoKm && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
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
                  <div><p className="text-sm text-gray-600">Valor da corrida</p><p className="text-2xl font-bold text-green-700">{formatarValor(valorCalculado)}</p></div>
                  <div className="text-right text-sm text-gray-500"><p>{kmNum.toFixed(1)} km</p><p className="text-xs">faixa registrada</p></div>
                </div>
              </div>
            )}

            <button onClick={salvarEntrega} disabled={!podeConfirmar || salvando || sucesso}
              className={\`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-md \${sucesso ? 'bg-green-500 text-white' : podeConfirmar ? 'bg-green-600 hover:bg-green-700 active:scale-95 text-white' : 'bg-gray-200 text-gray-400'}\`}>
              {sucesso ? '✅ Entrega registrada!' : salvando ? 'Salvando...' : '✅ Confirmar entrega'}
            </button>
          </div>
        )}

        {aba === 'historico' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo do dia</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Diária ({profile.tipo})</span><span className="font-semibold">{formatarValor(valorDiaria)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Corridas ({entregas.length}x)</span><span className="font-semibold">{formatarValor(totalValor)}</span></div>
                <div className="border-t border-gray-100 pt-2 flex justify-between"><span className="font-bold text-gray-800">Total do dia</span><span className="font-bold text-green-700 text-lg">{formatarValor(totalDia)}</span></div>
              </div>
            </div>
            {entregas.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">📭</span>Nenhuma entrega registrada hoje</div>
            ) : (
              entregas.map((e, i) => (
                <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <div className="text-lg mt-0.5">{e.tipo === 'ifood' ? '🛍️' : '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.endereco_destino}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{e.km_calculado ? \`\${e.km_calculado} km · \` : ''}{new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right"><p className="font-bold text-green-700">{formatarValor(e.valor_km)}</p><p className="text-xs text-gray-400">#{entregas.length - i}</p></div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
`)

// src/app/admin/page.tsx
write('src/app/admin/page.tsx', `import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

  const { data: entregasHoje } = await supabase
    .from('entregas_completas').select('*')
    .gte('created_at', hoje.toISOString()).order('created_at', { ascending: false })

  const { data: motoboys } = await supabase.from('profiles').select('*').eq('role', 'motoboy').order('nome')
  const { data: enderecos } = await supabase.from('enderecos_favoritos').select('*').order('nome')

  return <AdminClient profile={profile} entregasIniciais={entregasHoje || []} motoboysList={motoboys || []} enderecosList={enderecos || []} />
}
`)

// src/app/admin/AdminClient.tsx
write('src/app/admin/AdminClient.tsx', `'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatarValor } from '@/lib/km'
import { useRouter } from 'next/navigation'
import { LogOut, Users, MapPin, BarChart3, RefreshCw, Plus, Trash2 } from 'lucide-react'

type Profile = { id: string; nome: string; tipo: string; role: string }
type Entrega = { id: string; tipo: string; codigo_ifood: string | null; endereco_destino: string; km_calculado: number | null; valor_km: number; created_at: string; motoboy_nome: string; motoboy_tipo: string; motoboy_id: string }
type Endereco = { id: string; nome: string; endereco_completo: string; ativo: boolean }

interface Props { profile: Profile; entregasIniciais: Entrega[]; motoboysList: Profile[]; enderecosList: Endereco[] }

export default function AdminClient({ profile, entregasIniciais, motoboysList, enderecosList }: Props) {
  const [aba, setAba] = useState<'entregas' | 'motoboys' | 'enderecos'>('entregas')
  const [entregas, setEntregas] = useState<Entrega[]>(entregasIniciais)
  const [motoboys, setMotoboys] = useState<Profile[]>(motoboysList)
  const [enderecos, setEnderecos] = useState<Endereco[]>(enderecosList)
  const [carregando, setCarregando] = useState(false)
  const [novoEndNome, setNovoEndNome] = useState('')
  const [novoEndCompleto, setNovoEndCompleto] = useState('')
  const [salvandoEnd, setSalvandoEnd] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoTipo, setNovoTipo] = useState<'fixo' | 'avulso'>('fixo')
  const [salvandoMotoboy, setSalvandoMotoboy] = useState(false)
  const [erroMotoboy, setErroMotoboy] = useState('')

  const supabase = createClient()
  const router = useRouter()

  const totalValorCorridas = entregas.reduce((s, e) => s + e.valor_km, 0)
  const totalKm = entregas.reduce((s, e) => s + (e.km_calculado || 0), 0)
  const totalDiarias = motoboys.reduce((s, m) => s + (m.tipo === 'fixo' ? 45 : 35), 0)

  async function recarregar() {
    setCarregando(true)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
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

  async function criarMotoboy() {
    if (!novoNome || !novoEmail || !novaSenha) return
    setSalvandoMotoboy(true); setErroMotoboy('')
    const { data, error } = await supabase.auth.signUp({ email: novoEmail, password: novaSenha, options: { data: { nome: novoNome } } })
    if (error) { setErroMotoboy(error.message); setSalvandoMotoboy(false); return }
    if (data.user) {
      await supabase.from('profiles').update({ nome: novoNome, tipo: novoTipo }).eq('id', data.user.id)
      setMotoboys(prev => [...prev, { id: data.user!.id, nome: novoNome, tipo: novoTipo, role: 'motoboy' }])
      setNovoNome(''); setNovoEmail(''); setNovaSenha(''); setNovoTipo('fixo')
    }
    setSalvandoMotoboy(false)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/login') }

  const porMotoboy = motoboys.map(m => {
    const ent = entregas.filter(e => e.motoboy_id === m.id)
    return { ...m, entregas: ent, totalKm: ent.reduce((s, e) => s + (e.km_calculado || 0), 0), totalValor: ent.reduce((s, e) => s + e.valor_km, 0), diaria: m.tipo === 'fixo' ? 45 : 35 }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2"><span className="text-xl">🏢</span><span className="font-bold text-lg">Admin · All Natural</span></div>
          <p className="text-gray-400 text-xs mt-0.5">Painel de controle</p>
        </div>
        <button onClick={sair} className="p-2 rounded-full hover:bg-gray-700"><LogOut size={18} /></button>
      </header>

      <div className="bg-gray-900 px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-300">Entregas hoje</p>
            <p className="text-2xl font-bold">{entregas.length}</p>
            <p className="text-xs text-gray-400">{totalKm.toFixed(1)} km total</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <p className="text-xs text-gray-300">Custo do dia</p>
            <p className="text-2xl font-bold">{formatarValor(totalValorCorridas + totalDiarias)}</p>
            <p className="text-xs text-gray-400">corridas + diárias</p>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b border-gray-200">
        {[{ key: 'entregas', icon: <BarChart3 size={14} />, label: 'Entregas' }, { key: 'motoboys', icon: <Users size={14} />, label: 'Motoboys' }, { key: 'enderecos', icon: <MapPin size={14} />, label: 'Endereços' }].map(tab => (
          <button key={tab.key} onClick={() => setAba(tab.key as 'entregas' | 'motoboys' | 'enderecos')}
            className={\`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors \${aba === tab.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}\`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {aba === 'entregas' && (
          <div className="space-y-3">
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
                  <div className="text-right"><p className="font-bold text-green-700">{formatarValor(m.totalValor + m.diaria)}</p><p className="text-xs text-gray-400">diária + corridas</p></div>
                </div>
                {m.entregas.length === 0 ? <p className="text-xs text-gray-400 italic">Nenhuma entrega ainda</p> : (
                  <div className="space-y-1">
                    {m.entregas.slice(0, 5).map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 truncate flex-1 mr-2">{e.tipo === 'ifood' ? '🛍️' : '📦'} {e.endereco_destino}</span>
                        <span className="text-gray-700 font-medium shrink-0">{e.km_calculado ? \`\${e.km_calculado}km · \` : ''}{formatarValor(e.valor_km)}</span>
                      </div>
                    ))}
                    {m.entregas.length > 5 && <p className="text-xs text-gray-400">+{m.entregas.length - 5} mais...</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {aba === 'motoboys' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {motoboys.map(m => (
                <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="font-semibold text-gray-800">🛵 {m.nome}</p><p className="text-xs text-gray-400">{m.tipo === 'fixo' ? 'Fixo · R$45/dia' : 'Avulso · R$35/dia'}</p></div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Ativo</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} /> Novo motoboy</h3>
              <div className="space-y-3">
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="Nome completo" />
                <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="Email" />
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="Senha inicial" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setNovoTipo('fixo')} className={\`py-2 rounded-xl text-sm font-semibold \${novoTipo === 'fixo' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}\`}>Fixo (R$45)</button>
                  <button onClick={() => setNovoTipo('avulso')} className={\`py-2 rounded-xl text-sm font-semibold \${novoTipo === 'avulso' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}\`}>Avulso (R$35)</button>
                </div>
                {erroMotoboy && <p className="text-red-600 text-xs">{erroMotoboy}</p>}
                <button onClick={criarMotoboy} disabled={salvandoMotoboy || !novoNome || !novoEmail || !novaSenha}
                  className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {salvandoMotoboy ? 'Criando...' : 'Criar motoboy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {aba === 'enderecos' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {enderecos.map(e => (
                <div key={e.id} className={\`bg-white rounded-2xl p-4 shadow-sm flex items-start justify-between \${!e.ativo ? 'opacity-40' : ''}\`}>
                  <div className="flex-1 mr-2"><p className="font-semibold text-gray-800">{e.nome}</p><p className="text-xs text-gray-400 mt-0.5">{e.endereco_completo}</p></div>
                  {e.ativo && <button onClick={() => removerEndereco(e.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} /> Novo endereço favorito</h3>
              <div className="space-y-3">
                <input type="text" value={novoEndNome} onChange={e => setNovoEndNome(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="Nome (ex: Loja da Thaty)" />
                <input type="text" value={novoEndCompleto} onChange={e => setNovoEndCompleto(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="Endereço completo com bairro e cidade" />
                <button onClick={adicionarEndereco} disabled={salvandoEnd || !novoEndNome || !novoEndCompleto}
                  className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {salvandoEnd ? 'Salvando...' : 'Adicionar endereço'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
`)

// src/app/api/calcular-km/route.ts
write('src/app/api/calcular-km/route.ts', `import { NextRequest, NextResponse } from 'next/server'

const ORIGEM = 'Av. Silva Jardim 2424, Batel, Curitiba, PR, Brazil'

export async function GET(req: NextRequest) {
  const destino = req.nextUrl.searchParams.get('destino')
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!destino) return NextResponse.json({ error: 'Destino obrigatório' }, { status: 400 })
  if (!apiKey) return NextResponse.json({ km: null, manual: true })
  try {
    const url = \`https://maps.googleapis.com/maps/api/distancematrix/json?origins=\${encodeURIComponent(ORIGEM)}&destinations=\${encodeURIComponent(destino + ', Curitiba, PR, Brazil')}&key=\${apiKey}&units=metric&language=pt-BR\`
    const res = await fetch(url)
    const data = await res.json()
    const elemento = data.rows?.[0]?.elements?.[0]
    if (elemento?.status === 'OK') {
      const km = Math.round((elemento.distance.value / 1000) * 10) / 10
      return NextResponse.json({ km, endereco: data.destination_addresses?.[0] })
    }
    return NextResponse.json({ km: null, manual: true })
  } catch { return NextResponse.json({ km: null, manual: true }) }
}
`)

console.log('\n🚀 Todos os arquivos criados com sucesso!')
console.log('\nPróximo passo: rode o SQL no Supabase e depois npm run dev')