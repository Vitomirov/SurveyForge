/**
 * Account lifecycle emails (invite, verify email, reset password).
 * Builds the app link for a one-time token and a plain-text + minimal HTML body.
 * Tokens travel in the URL fragment so they never reach server access logs.
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function authLink(appUrl, view, token) {
  return `${appUrl}/#/${view}?token=${encodeURIComponent(token)}`
}

function render({ heading, intro, cta, link, footer }) {
  const text = [heading, '', intro, '', `${cta}: ${link}`, '', footer].join('\n')
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;line-height:1.5">
  <h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(heading)}</h2>
  <p style="margin:0 0 16px">${escapeHtml(intro)}</p>
  <p style="margin:0 0 20px">
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${escapeHtml(cta)}</a>
  </p>
  <p style="margin:0 0 8px;font-size:12px;color:#6b7280">If the button does not work, copy this link into your browser:<br>${escapeHtml(link)}</p>
  <p style="margin:0;font-size:12px;color:#6b7280">${escapeHtml(footer)}</p>
</div>`.trim()
  return { text, html }
}

export function inviteEmail({ appUrl, token, organizationName, inviterName, expiresInDays }) {
  const link = authLink(appUrl, 'accept-invite', token)
  return {
    subject: `${inviterName} invited you to ${organizationName} on Rescope Surveys`,
    ...render({
      heading: `Join ${organizationName}`,
      intro: `${inviterName} invited you to collaborate on surveys in ${organizationName}. Accept the invitation to choose your password and get started.`,
      cta: 'Accept invitation',
      link,
      footer: `This invitation expires in ${expiresInDays} days. If you did not expect it, you can ignore this email.`,
    }),
  }
}

export function verifyEmail({ appUrl, token, name, expiresInHours }) {
  const link = authLink(appUrl, 'verify-email', token)
  return {
    subject: 'Confirm your email for Rescope Surveys',
    ...render({
      heading: `Hi ${name}, confirm your email`,
      intro: 'Please confirm this email address so you can invite teammates and recover your account.',
      cta: 'Confirm email',
      link,
      footer: `This link expires in ${expiresInHours} hours. If you did not create an account, you can ignore this email.`,
    }),
  }
}

export function resetPasswordEmail({ appUrl, token, name, expiresInMinutes }) {
  const link = authLink(appUrl, 'reset-password', token)
  return {
    subject: 'Reset your Rescope Surveys password',
    ...render({
      heading: `Hi ${name}, reset your password`,
      intro: 'We received a request to reset the password for your account. Choose a new password using the link below.',
      cta: 'Reset password',
      link,
      footer: `This link expires in ${expiresInMinutes} minutes and can be used once. If you did not request a reset, your password is unchanged — you can ignore this email.`,
    }),
  }
}
