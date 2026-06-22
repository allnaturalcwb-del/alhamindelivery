import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function enviarEmail(para: string, assunto: string, html: string) {
  await transporter.sendMail({
    from: `"All Natural Batel" <${process.env.GMAIL_USER}>`,
    to: para,
    subject: assunto,
    html,
  })
}
