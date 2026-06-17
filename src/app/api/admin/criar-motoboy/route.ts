import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { nome, email, senha, tipo } = await req.json()

  if (!nome || !email || !senha || !tipo) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Cria o usuário auth com service client (bypassa RLS)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id
  const diaria = tipo === 'fixo' ? 40 : 30

  // Upsert profile com service client (bypassa RLS)
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    nome,
    role: 'motoboy',
    tipo,
    valor_diaria: diaria,
    ativo: true,
  })

  if (profileError) {
    // Reverte criação do usuário se o profile falhar
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: userId, nome, tipo, valor_diaria: diaria, role: 'motoboy', ativo: true })
}
