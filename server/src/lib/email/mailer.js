/**
 * Outbound email transport.
 * `smtp` sends through nodemailer; `log` records messages in memory and logs
 * them (development / integration tests only — never enabled on a VPS).
 */
import nodemailer from 'nodemailer'

const LOG_MAILBOX_LIMIT = 200

export function createMailer(config, log) {
  const from = config.emailFrom

  if (config.emailTransport === 'log') {
    const mailbox = []
    return {
      transport: 'log',
      async send({ to, subject, text, html }) {
        const message = { to, subject, text, html, sentAt: new Date().toISOString() }
        mailbox.push(message)
        if (mailbox.length > LOG_MAILBOX_LIMIT) mailbox.shift()
        log.info({ to, subject }, `[mail:log] ${text}`)
      },
      /** Dev-only: messages delivered to an address, newest first. */
      messagesFor(to) {
        const needle = String(to || '').trim().toLowerCase()
        return mailbox.filter(m => m.to.toLowerCase() === needle).reverse()
      },
    }
  }

  const transporter = nodemailer.createTransport(config.smtpUrl)
  return {
    transport: 'smtp',
    async send({ to, subject, text, html }) {
      await transporter.sendMail({ from, to, subject, text, html })
    },
    messagesFor() {
      return []
    },
  }
}
