/**
 * Exposes `app.config` and `app.mailer` to routes.
 */
import { createMailer } from '../lib/email/mailer.js'

export async function registerMailer(app, config) {
  app.decorate('config', config)
  app.decorate('mailer', createMailer(config, app.log))
  app.log.info(`Email transport: ${config.emailTransport}`)
}
