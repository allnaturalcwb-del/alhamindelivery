import { NextResponse } from 'next/server'
import { enviarEmail } from '@/lib/email'

export async function POST() {
  try {
    await enviarEmail(
      process.env.GMAIL_USER!,
      "✅ Teste de email — Al'hamin Delivery Control",
      `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#F5F0E6;font-family:Arial,sans-serif">
          <div style="max-width:480px;margin:0 auto;padding:24px">
            <div style="background:#1C1C1C;border-radius:12px 12px 0 0;padding:20px 24px">
              <div style="color:#2B6344;font-weight:800;font-size:18px">🌿 AL'HAMIN</div>
            </div>
            <div style="background:white;padding:24px;border-radius:0 0 12px 12px;text-align:center">
              <div style="font-size:48px;margin-bottom:12px">✅</div>
              <h2 style="color:#1C1C1C;margin:0 0 8px">Email configurado com sucesso!</h2>
              <p style="color:#666;font-size:14px">O sistema de relatórios quinzenais está pronto para enviar emails automaticamente.</p>
            </div>
          </div>
        </body>
        </html>
      `
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro ao enviar email de teste:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
