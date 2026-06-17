-- =====================================================
-- AL'HAMIN DELIVERY CONTROL — Setup completo do banco
-- Rodar no Supabase SQL Editor do projeto Al Hamin
-- =====================================================

-- 1. Tabela de perfis (motoboys e admins)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'motoboy', -- 'motoboy' | 'admin'
  tipo TEXT NOT NULL DEFAULT 'avulso',  -- 'fixo' | 'avulso'
  ativo BOOLEAN DEFAULT true,
  valor_diaria NUMERIC DEFAULT 30
);

-- 2. Tabela de entregas
CREATE TABLE IF NOT EXISTS entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'ifood', -- 'ifood' | 'por_fora'
  codigo_ifood TEXT,
  endereco_destino TEXT NOT NULL,
  km_calculado NUMERIC,
  valor_km NUMERIC NOT NULL DEFAULT 0,
  enviado_go BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Endereços favoritos
CREATE TABLE IF NOT EXISTS enderecos_favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco_completo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Contagem de endereços digitados (auto-save após 3 usos)
CREATE TABLE IF NOT EXISTS enderecos_contagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endereco_completo TEXT NOT NULL UNIQUE,
  contagem INTEGER DEFAULT 1,
  ultimo_uso TIMESTAMPTZ DEFAULT now()
);

-- 5. Escala de motoboys por turno
CREATE TABLE IF NOT EXISTS escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  turno TEXT NOT NULL, -- 'manha' | 'noite'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(motoboy_id, data, turno)
);

-- =====================================================
-- RLS — Row Level Security
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE enderecos_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE enderecos_contagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;

-- Profiles: cada user lê o próprio; service role acessa tudo
CREATE POLICY "users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "service role full access profiles" ON profiles USING (true) WITH CHECK (true);

-- Entregas: motoboy acessa as próprias; service role acessa tudo
CREATE POLICY "motoboy reads own entregas" ON entregas FOR SELECT USING (auth.uid() = motoboy_id);
CREATE POLICY "motoboy inserts own entregas" ON entregas FOR INSERT WITH CHECK (auth.uid() = motoboy_id);
CREATE POLICY "service role full access entregas" ON entregas USING (true) WITH CHECK (true);

-- Endereços: leitura pública autenticada
CREATE POLICY "authenticated read enderecos" ON enderecos_favoritos FOR SELECT TO authenticated USING (true);
CREATE POLICY "service role full access enderecos" ON enderecos_favoritos USING (true) WITH CHECK (true);

-- Enderecos contagem: service role
CREATE POLICY "service role full access contagem" ON enderecos_contagem USING (true) WITH CHECK (true);

-- Escalas: leitura pública autenticada
CREATE POLICY "authenticated read escalas" ON escalas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert escalas" ON escalas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update escalas" ON escalas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "service role full access escalas" ON escalas USING (true) WITH CHECK (true);

-- =====================================================
-- NOTA: Após rodar este SQL, criar os usuários manualmente
-- no Supabase Auth > Users > Add User (Auto Confirm User)
-- e depois rodar o UPDATE abaixo para cada um:
--
-- UPDATE profiles SET nome='Nome', role='admin', tipo='fixo', valor_diaria=40
-- WHERE id = 'UUID_DO_USUARIO';
-- =====================================================
