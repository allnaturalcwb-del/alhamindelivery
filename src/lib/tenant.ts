const tenant = {
  nome: "Al'hamin",
  nomeCompleto: "Al'hamin Delivery Control",
  subtitulo: 'Culinária árabe autêntica',
  bairro: process.env.NEXT_PUBLIC_TENANT_BAIRRO || 'Curitiba',
  corPrimaria: '#2B6344',
  corPrimariaHover: '#1e4d31',
  corPrimariaDark: '#1C3D28',
  corFundo: '#F5F0E6',
  corTextoDestaque: '#EDD9A3',
  themeColor: '#2B6344',
  origem: process.env.TENANT_ORIGEM || 'Curitiba, PR, Brazil',
  whatsapp: process.env.NEXT_PUBLIC_TENANT_WHATSAPP || '',
}

export default tenant
