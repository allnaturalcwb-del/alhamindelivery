import { formatarPeriodo, type Quinzena } from './quinzena'
import { contarDiasAtivosPorTurno } from './turno'

type Motoboy = { id: string; nome: string; tipo: string; valor_diaria: number }
type Entrega = { motoboy_id: string; valor_km: number; km_calculado: number | null; created_at: string }

type RelatorioMotoboy = {
  nome: string
  tipo: string
  entregas: number
  totalCorridas: number
  diasAtivos: number
  diasManha: number
  diasNoite: number
  diaria: number
  diariaNoite: number
  totalDiarias: number
  totalAPagar: number
}

export function gerarRelatorio(
  quinzena: Quinzena,
  motoboys: Motoboy[],
  entregas: Entrega[],
  modo: 'motoboy' | 'admin'
): { linhas: RelatorioMotoboy[]; totalGeral: number } {
  const diariaManhaFixo = modo === 'admin' ? 45 : 40
  const diariaManhaAvulso = modo === 'admin' ? 35 : 30
  const diariaNoite = modo === 'admin' ? 45 : 40

  const linhas: RelatorioMotoboy[] = motoboys.map(m => {
    const ents = entregas.filter(e => e.motoboy_id === m.id)
    const diasManha = contarDiasAtivosPorTurno(ents, 'manha')
    const diasNoite = contarDiasAtivosPorTurno(ents, 'noite')
    const totalCorridas = ents.reduce((s, e) => s + e.valor_km, 0)
    const diariaManha = m.tipo === 'fixo' ? diariaManhaFixo : diariaManhaAvulso
    const totalDiarias = diasManha * diariaManha + diasNoite * diariaNoite
    return {
      nome: m.nome,
      tipo: m.tipo,
      entregas: ents.length,
      totalCorridas,
      diasAtivos: diasManha + diasNoite,
      diasManha,
      diasNoite,
      diaria: diariaManha,
      diariaNoite,
      totalDiarias,
      totalAPagar: totalCorridas + totalDiarias,
    }
  }).filter(m => m.entregas > 0)

  const totalGeral = linhas.reduce((s, m) => s + m.totalAPagar, 0)
  return { linhas, totalGeral }
}

export function gerarHTMLRelatorio(
  quinzena: Quinzena,
  motoboys: Motoboy[],
  entregas: Entrega[],
  modo: 'motoboy' | 'admin'
): string {
  const { linhas, totalGeral } = gerarRelatorio(quinzena, motoboys, entregas, modo)
  const periodo = formatarPeriodo(quinzena)
  const titulo = modo === 'admin' ? `[ADMIN] ${quinzena.label}` : quinzena.label

  const linhasHTML = linhas.map(m => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;font-weight:600">${m.nome}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;text-align:center;color:#666">${m.tipo}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;text-align:center">${m.entregas}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;text-align:center;font-size:12px">${m.diasManha > 0 ? `${m.diasManha}x manhã R$${m.diaria}` : ''}${m.diasManha > 0 && m.diasNoite > 0 ? '<br>' : ''}${m.diasNoite > 0 ? `${m.diasNoite}x noite R$${m.diariaNoite}` : ''}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;text-align:right">R$ ${m.totalCorridas.toFixed(2).replace('.', ',')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;text-align:right">R$ ${m.totalDiarias.toFixed(2).replace('.', ',')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0e0d0;text-align:right;font-weight:700;color:#F7941D">R$ ${m.totalAPagar.toFixed(2).replace('.', ',')}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#FFF8F0;font-family:Arial,sans-serif">
      <div style="max-width:680px;margin:0 auto;padding:24px">

        <div style="background:#1C1C1C;border-radius:12px 12px 0 0;padding:20px 24px;display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">🥕</span>
          <div>
            <div style="color:#F7941D;font-weight:800;font-size:18px;letter-spacing:1px">ALL NATURAL BATEL</div>
            <div style="color:#999;font-size:12px">Resumo Quinzenal Motoboys</div>
          </div>
        </div>

        <div style="background:#F7941D;padding:16px 24px">
          <div style="color:white;font-weight:700;font-size:16px">${titulo}</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px">Período: ${periodo}</div>
          ${modo === 'admin' ? '<div style="background:rgba(0,0,0,0.2);color:white;font-size:11px;padding:4px 10px;border-radius:20px;display:inline-block;margin-top:6px">🔒 Versão confidencial — apenas administradores</div>' : ''}
        </div>

        <div style="background:white;padding:8px 0">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#FFF8F0">
                <th style="padding:10px 12px;text-align:left;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Motoboy</th>
                <th style="padding:10px 12px;text-align:center;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Tipo</th>
                <th style="padding:10px 12px;text-align:center;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Entregas</th>
                <th style="padding:10px 12px;text-align:center;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Diárias</th>
                <th style="padding:10px 12px;text-align:right;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Corridas</th>
                <th style="padding:10px 12px;text-align:right;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Diárias R$</th>
                <th style="padding:10px 12px;text-align:right;color:#666;font-weight:600;border-bottom:2px solid #F7941D">Total</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHTML}
            </tbody>
          </table>
        </div>

        <div style="background:#1C1C1C;border-radius:0 0 12px 12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="color:#999;font-size:12px">${linhas.length} motoboys · ${linhas.reduce((s, m) => s + m.entregas, 0)} entregas</div>
            <div style="color:white;font-weight:600;font-size:13px">Total geral da quinzena</div>
          </div>
          <div style="color:#F7941D;font-weight:800;font-size:22px">R$ ${totalGeral.toFixed(2).replace('.', ',')}</div>
        </div>

        <div style="text-align:center;padding:16px;color:#bbb;font-size:11px">
          Gerado automaticamente pelo sistema All Natural Delivery Control
        </div>
      </div>
    </body>
    </html>
  `
}
