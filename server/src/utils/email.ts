import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!config.smtp.host) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  }
  return transporter
}

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    if (process.env.LOG_VERIFICATION_CODES !== 'false') {
      console.log(`[DEV] Verification code for ${email}: ${code}`)
    }
    return true
  }

  try {
    await t.sendMail({
      from: config.smtp.from,
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is: ${code}\nIt expires in 10 minutes.`,
    })
    return true
  } catch (err) {
    console.error(`[EMAIL] Failed to send verification code to ${email}:`, err instanceof Error ? err.message : err)
    return false
  }
}
