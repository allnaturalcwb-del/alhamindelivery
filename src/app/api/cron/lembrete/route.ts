import { NextResponse } from 'next/server'
import { enviarEmail } from '@/lib/email'
import { getQuinzenaFechada, formatarPeriodo } from '@/lib/quinzena'

// Disparado pelo Vercel Cron: dia 16 às 8h e dia 1º às 8h (horário UTC = 11h Brasília)
// Vercel envia Authorization: Bearer <CRON_SECRET> automaticamente
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quinzena = getQuinzenaFechada()
  if (!quinzena) {
    return NextResponse.json({ ok: false, motivo: 'Hoje não é dia de lembrete (16 ou 1º)' })
  }

  const periodo = formatarPeriodo(quinzena)

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#F5F0E6;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:24px">
        <div style="background:#1C1C1C;border-radius:12px 12px 0 0;padding:20px 24px">
          <div style="color:#2B6344;font-weight:800;font-size:18px">🌿 AL'HAMIN</div>
          <div style="color:#999;font-size:12px">Sistema de Controle de Entregas</div>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 12px 12px">
          <h2 style="color:#1C1C1C;margin:0 0 12px">📋 Hora de fechar a quinzena!</h2>
          <p style="color:#444;line-height:1.6">
            A <strong>${quinzena.label}</strong> (${periodo}) acabou de fechar.
          </p>
          <p style="color:#444;line-height:1.6">
            Para gerar o relatório de pagamento dos motoboys, você precisa:
          </p>
          <ol style="color:#444;line-height:2">
            <li>Entrar no painel do iFood</li>
            <li>Baixar o relatório de pedidos do período <strong>${periodo}</strong></li>
            <li>Acessar o sistema e fazer o upload na aba <strong>Quinzena</strong></li>
          </ol>
          <div style="margin-top:20px;text-align:center">
            <a href="https://allnaturaldelivery.vercel.app/admin"
              style="background:#2B6344;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
              Acessar o sistema →
            </a>
          </div>
        </div>
        <div style="text-align:center;padding:16px;color:#bbb;font-size:11px">
          Gerado automaticamente pelo sistema Al'hamin Delivery Control
        </div>
      </div>
    </body>
    </html>
  `

  await enviarEmail(
    process.env.REPORT_EMAIL || process.env.GMAIL_USER!,
    `⏰ Fechar ${quinzena.label} — upload planilha iFood`,
    html
  )

  return NextResponse.json({ ok: true, quinzena: quinzena.label })
}
