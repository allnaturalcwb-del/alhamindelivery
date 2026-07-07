import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { id, novaSenha } = await req.json()

  if (!id || !novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ error: 'Dados inválidos. Senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.updateUserById(id, { password: novaSenha })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
