/**
 * HTTP error response shaping.
 * Maps thrown errors to safe JSON bodies for API clients, hiding internal
 * details in production while preserving status codes and client-facing messages.
 */
export function publicErrorResponse(error, { isDev }) {
  if (error.statusCode === 413 || error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return { status: 413, body: { error: 'Payload too large' } }
  }

  const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
  if (status >= 500 && !isDev) {
    return { status: 500, body: { error: 'Internal server error' } }
  }
  return { status, body: { error: error.message || 'Internal server error' } }
}
