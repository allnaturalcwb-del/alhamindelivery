import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import QuiosqueClient from './QuiosqueClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ id: string }> }

export default async function QuiosqueMotoboy({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'motoboy')
    .single()

  if (!profile) notFound()

  const agora = new Date()
  const hoje = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  hoje.setHours(0, 0, 0, 0)

  const { data: entregasHoje } = await supabase
    .from('entregas')
    .select('*')
    .eq('motoboy_id', id)
    .gte('created_at', hoje.toISOString())
    .order('created_at', { ascending: false })

  const { data: enderecosFav } = await supabase
    .from('enderecos_favoritos')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  return (
    <QuiosqueClient
      profile={profile}
      entregasIniciais={entregasHoje || []}
      enderecosFavoritos={enderecosFav || []}
    />
  )
}
