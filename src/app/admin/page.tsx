import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const agora = new Date()
  // Calcula meia-noite BRT corretamente — evita bug quando servidor roda em UTC
  const brtNow = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const offsetMs = agora.getTime() - brtNow.getTime() // ex: +10800000 ms (UTC-3)
  const diaStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // "YYYY-MM-DD"
  const hoje = new Date(new Date(diaStr + 'T00:00:00Z').getTime() + offsetMs)

  const { data: entregasHoje } = await supabase
    .from('entregas_completas').select('*')
    .gte('created_at', hoje.toISOString()).order('created_at', { ascending: false })

  const { data: todasEntregas } = await supabase
    .from('entregas_completas').select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: motoboys } = await supabase.from('profiles').select('*').eq('role', 'motoboy').order('nome')
  const { data: enderecos } = await supabase.from('enderecos_favoritos').select('*').order('nome')

  return <AdminClient
    profile={profile}
    entregasIniciais={entregasHoje || []}
    todasEntregas={todasEntregas || []}
    motoboysList={motoboys || []}
    enderecosList={enderecos || []}
  />
}