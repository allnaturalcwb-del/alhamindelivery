// Tela de seleção de unidade — aparece após login quando o tenant tem múltiplas unidades
// Ex: allhamin.vercel.app → login → aqui → escolhe Fazendinha, Batel ou Centro

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UnidadesClient from './UnidadesClient'

export default async function UnidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca o tenant do usuário
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nome_empresa, status')
    .eq('user_id', user.id)
    .single()

  if (!tenant) redirect('/onboarding/pagamento')
  if (tenant.status === 'pending_payment') redirect('/onboarding/pagamento')
  if (tenant.status === 'suspended') redirect('/onboarding/suspenso')

  // Busca config de marca do tenant
  const { data: config } = await supabase
    .from('tenant_configs')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  // Busca unidades ativas
  const { data: unidades } = await supabase
    .from('tenant_units')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('ativo', true)
    .order('ordem')

  // Se só tem 1 unidade, vai direto pro dashboard
  if (!unidades || unidades.length === 0) redirect('/dashboard')
  if (unidades.length === 1) {
    // Salva unit_id no cookie e vai pro dashboard
    redirect(`/dashboard?unit=${unidades[0].id}`)
  }

  return (
    <UnidadesClient
      tenant={tenant}
      config={config}
      unidades={unidades}
    />
  )
}
