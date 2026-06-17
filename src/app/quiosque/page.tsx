import { createServiceClient } from '@/lib/supabase/service'
import QuiosqueSelecaoClient from './QuiosqueSelecaoClient'

type Profile = { id: string; nome: string; tipo: string }

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function QuiosquePage() {
  let motoboys: Profile[] = []

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, tipo')
      .eq('role', 'motoboy')
      .eq('ativo', true)
      .order('nome')
    motoboys = data || []
  } catch {
    // Service role key não configurado ainda — mostra instrução
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'COLE_AQUI_A_SERVICE_ROLE_KEY') {
    return (
      <div className="min-h-screen bg-[#2B6344] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl">
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Configuração necessária</h2>
          <p className="text-gray-600 text-sm mb-4">
            Adicione a <strong>Service Role Key</strong> do Supabase no arquivo <code className="bg-gray-100 px-1 rounded">.env.local</code> e no Vercel.
          </p>
          <p className="text-xs text-gray-400">Supabase → Settings → API → service_role (secret)</p>
        </div>
      </div>
    )
  }

  return <QuiosqueSelecaoClient motoboysIniciais={motoboys} />
}
