import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarEmail } from '@/lib/email'
import { gerarHTMLRelatorio } from '@/lib/relatorio'
import * as XLSX from 'xlsx'

// GET: buscar dados da quinzena para preview no admin
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const inicio = searchParams.get('inicio')
  const fim = searchParams.get('fim')

  if (!inicio || !fim) return NextResponse.json({ error: 'Período obrigatório' }, { status: 400 })

  const [{ data: entregas }, { data: motoboys }] = await Promise.all([
    supabase.from('entregas_completas').select('*').gte('created_at', inicio).lte('created_at', fim),
    supabase.from('profiles').select('*').eq('role', 'motoboy').order('nome'),
  ])

  return NextResponse.json({ entregas: entregas || [], motoboys: motoboys || [] })
}

// POST: upload planilha iFood + cruzamento + disparo de emails
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const arquivo = formData.get('arquivo') as File | null
  const inicio = formData.get('inicio') as string
  const fim = formData.get('fim') as string
  const labelQuinzena = formData.get('label') as string
  const acao = formData.get('acao') as string // 'cruzar' | 'enviar'

  if (!inicio || !fim) return NextResponse.json({ error: 'Período obrigatório' }, { status: 400 })

  const supabase = createServiceClient()

  const [{ data: entregas }, { data: motoboys }] = await Promise.all([
    supabase.from('entregas_completas').select('*').gte('created_at', inicio).lte('created_at', fim),
    supabase.from('profiles').select('*').eq('role', 'motoboy').order('nome'),
  ])

  const todasEntregas = entregas || []
  const todosMotoboys = motoboys || []

  // Se tiver arquivo, parsear e cruzar
  let cruzamento: { totalSistema: number; totalIfood: number; ok: boolean } | null = null

  if (arquivo && arquivo.size > 0) {
    const buffer = await arquivo.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]

    const inicioDate = new Date(inicio)
    const fimDate = new Date(fim)

    // Colunas de data comuns no export do iFood (português)
    const COLUNAS_DATA = [
      'Data do Pedido', 'Data de criação', 'Data', 'Criado em',
      'Data pedido', 'data_pedido', 'created_at', 'date', 'Data de Registro',
      'Data de Conclusão', 'Data Conclusão',
    ]

    const totalIfood = rows.filter(row => {
      // 1. Tentar colunas conhecidas do iFood primeiro
      for (const col of COLUNAS_DATA) {
        const val = row[col]
        if (!val) continue
        if (val instanceof Date && val >= inicioDate && val <= fimDate) return true
        if (typeof val === 'string' || typeof val === 'number') {
          const d = new Date(val as string)
          if (!isNaN(d.getTime()) && d >= inicioDate && d <= fimDate) return true
        }
      }
      // 2. Fallback: qualquer coluna com valor de data no período
      for (const val of Object.values(row)) {
        if (val instanceof Date && val >= inicioDate && val <= fimDate) return true
        if (typeof val === 'string' && val.match(/\d{2}\/\d{2}\/\d{4}/)) {
          const [d, m, y] = val.split('/').map(Number)
          const date = new Date(y, m - 1, d)
          if (date >= inicioDate && date <= fimDate) return true
        }
      }
      return false
    }).length

    const totalSistema = todasEntregas.filter(e => e.tipo === 'ifood').length
    cruzamento = { totalSistema, totalIfood, ok: totalSistema === totalIfood }
  }

  // Se ação for enviar relatórios
  if (acao === 'enviar') {
    const quinzena = {
      inicio: new Date(inicio),
      fim: new Date(fim),
      label: labelQuinzena,
      numero: 1 as 1 | 2,
      mes: new Date(inicio).getMonth(),
      ano: new Date(inicio).getFullYear(),
    }

    const [htmlMotoboy, htmlAdmin] = [
      gerarHTMLRelatorio(quinzena, todosMotoboys, todasEntregas, 'motoboy'),
      gerarHTMLRelatorio(quinzena, todosMotoboys, todasEntregas, 'admin'),
    ]

    const assunto = `Resumo Quinzenal Motoboys All Batel — ${labelQuinzena}`

    await Promise.all([
      enviarEmail(process.env.REPORT_EMAIL || process.env.GMAIL_USER!, assunto, htmlMotoboy),
      enviarEmail(process.env.REPORT_EMAIL || process.env.GMAIL_USER!, `[ADMIN] ${assunto}`, htmlAdmin),
    ])

    return NextResponse.json({ ok: true, enviado: true, cruzamento })
  }

  return NextResponse.json({ ok: true, cruzamento, totalEntregas: todasEntregas.length, totalMotoboys: todosMotoboys.length })
}
