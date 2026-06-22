// Middleware Next.js — session refresh + proteção de tenants inadimplentes
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — obrigatório
  const { data: { user } } = await supabase.auth.getUser()

  // Rotas que não precisam de tenant ativo
  const publicPaths = ['/login', '/cadastro', '/onboarding', '/api/']
  if (publicPaths.some(p => pathname.startsWith(p))) return supabaseResponse

  // Usuário não autenticado → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // All Natural é o tenant principal — sem cobrança SaaS, acesso sempre livre
  // Verificação de status de tenant só ativa quando NEXT_PUBLIC_TENANT_SLUG está definido
  const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG
  if (!tenantSlug) return supabaseResponse

  // Admin nunca é bloqueado por status de tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') return supabaseResponse

  // Verifica status do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('status')
    .eq('user_id', user.id)
    .single()

  // Sem tenant ou pagamento pendente → tela de pagamento
  if (!tenant || tenant.status === 'pending_payment') {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding/pagamento', request.url))
    }
  }

  // Tenant suspenso (mensalidade vencida) → tela de aviso
  if (tenant?.status === 'suspended') {
    if (!pathname.startsWith('/onboarding/suspenso')) {
      return NextResponse.redirect(new URL('/onboarding/suspenso', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
