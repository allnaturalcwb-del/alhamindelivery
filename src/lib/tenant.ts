// Configuração de tenant — lida via NEXT_PUBLIC_TENANT_SLUG
// all-natural-delivery → sem slug → All Natural (laranja)
// alhamindelivery → NEXT_PUBLIC_TENANT_SLUG=alhamin → Al'hamin (verde)

const slug = process.env.NEXT_PUBLIC_TENANT_SLUG || null

const alhaminConfig = {
  nome: "Al'hamin",
  nomeCompleto: "Al'hamin Delivery Control",
  bairro: process.env.NEXT_PUBLIC_TENANT_BAIRRO || 'Curitiba',
  corPrimaria: '#2B6344',
  corPrimariaHover: '#1e4a30',
  corFundo: '#F5F0E6',
  themeColor: '#2B6344',
  origem: process.env.TENANT_ORIGEM || 'Curitiba, PR, Brazil',
  whatsapp: process.env.NEXT_PUBLIC_TENANT_WHATSAPP || '',
  logoEmoji: '🍃',
  logoImg: '/logo-alhamin.svg' as string | null,
}

const allNaturalConfig = {
  nome: 'All Natural',
  nomeCompleto: 'All Natural Delivery Control',
  bairro: process.env.NEXT_PUBLIC_TENANT_BAIRRO || 'Curitiba',
  corPrimaria: '#F7941D',
  corPrimariaHover: '#e07a0a',
  corFundo: '#FFF8F0',
  themeColor: '#F7941D',
  origem: process.env.TENANT_ORIGEM || 'Curitiba, PR, Brazil',
  whatsapp: process.env.NEXT_PUBLIC_TENANT_WHATSAPP || '',
  logoEmoji: '🥕',
  logoImg: null as string | null,
}

const tenant = slug === 'alhamin' ? alhaminConfig : allNaturalConfig

export default tenant

// ─── Tipos multi-tenant ───────────────────────────────────────────────────────

export interface TenantConfig {
  id: string
  tenant_id: string
  slug: string
  nome_display: string
  cor_primaria: string
  cor_secundaria: string
  emoji: string
  vercel_url: string | null
}

export interface TenantUnit {
  id: string
  tenant_id: string
  nome: string
  slug: string
  endereco: string | null
  cidade: string | null
  vercel_url: string | null
  ordem: number
}

export function slugFromHostname(hostname: string): string | null {
  const hub = ['localhost', 'allnaturaldelivery.vercel.app', 'rotasimples.vercel.app']
  if (hub.some(h => hostname.includes(h)) || hostname.startsWith('127.')) return null
  const parts = hostname.split('.')
  if (parts.length >= 2) return parts[0]
  return null
}
