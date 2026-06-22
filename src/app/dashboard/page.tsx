import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')

  const agora = new Date()
  // Calcula meia-noite BRT corretamente — evita bug quando servidor roda em UTC
  const brtNow = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const offsetMs = agora.getTime() - brtNow.getTime()
  const diaStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const hoje = new Date(new Date(diaStr + 'T00:00:00Z').getTime() + offsetMs)

  const { data: entregasHoje } = await db
    .from('entregas').select('*').eq('motoboy_id', user.id)
    .gte('created_at', hoje.toISOString()).order('created_at', { ascending: false })

  const { data: todasEntregas } = await db
    .from('entregas').select('*').eq('motoboy_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: enderecosFav } = await db
    .from('enderecos_favoritos').select('*').eq('ativo', true).order('nome')

  return <DashboardClient
    profile={profile}
    entregasIniciais={entregasHoje || []}
    todasEntregas={todasEntregas || []}
    enderecosFavoritos={enderecosFav || []}
  />
}