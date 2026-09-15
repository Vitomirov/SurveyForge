/**
 * Dev-only mailbox for the `log` email transport.
 * Lets local development and integration tests read the links that would have
 * been emailed. Never registered in production.
 */
export async function registerDevMailboxRoutes(app, { isDev, emailTransport }) {
  if (!isDev || emailTransport !== 'log') return

  app.get('/api/internal/dev/mailbox', async (request, reply) => {
    const to = String(request.query?.to || '').trim()
    if (!to) return reply.code(400).send({ error: 'Query parameter "to" is required.' })
    return { messages: app.mailer.messagesFor(to) }
  })
}
