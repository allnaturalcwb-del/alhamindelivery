import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const agora = new Date()
  // Calcula meia-noite BRT corretamente — evita bug quando servidor roda em UTC
  const brtNow = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const offsetMs = agora.getTime() - brtNow.getTime() // ex: +10800000 ms (UTC-3)
  const diaStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // "YYYY-MM-DD"
  const hoje = new Date(new Date(diaStr + 'T00:00:00Z').getTime() + offsetMs)

  const { data: entregasHoje } = await db
    .from('entregas_completas').select('*')
    .gte('created_at', hoje.toISOString()).order('created_at', { ascending: false })

  const { data: todasEntregas } = await db
    .from('entregas_completas').select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: motoboyProfiles } = await db.from('profiles').select('*').eq('role', 'motoboy').order('nome')
  const { data: { users: authUsers } } = await db.auth.admin.listUsers({ perPage: 200 })
  const emailMap: Record<string, string> = {}
  authUsers?.forEach(u => { emailMap[u.id] = u.email ?? '' })
  const motoboys = (motoboyProfiles || []).map(m => ({ ...m, email: emailMap[m.id] ?? '' }))
  const { data: enderecos } = await db.from('enderecos_favoritos').select('*').order('nome')

  return <AdminClient
    profile={profile}
    entregasIniciais={entregasHoje || []}
    todasEntregas={todasEntregas || []}
    motoboysList={motoboys || []}
    enderecosList={enderecos || []}
  />
}