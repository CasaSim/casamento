export function recoveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const base = new URL(process.env.NEXTAUTH_URL || '');
  if (!apiKey || !from || !['http:', 'https:'].includes(base.protocol) ||
    (process.env.NODE_ENV === 'production' && base.protocol !== 'https:')) {
    throw new Error('Password recovery configuration is missing or invalid');
  }
  return { apiKey, from, base };
}

export async function sendRecoveryEmail(email: string, token: string) {
  const { apiKey, from, base } = recoveryConfig();
  const url = new URL('/auth/reset-password', base);
  url.searchParams.set('token', token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'CasaSim — Redefinição de senha',
      text: `Para redefinir sua senha, acesse o link abaixo:\n\n${url.toString()}\n\nO link expira em 1 hora e pode ser usado apenas uma vez. Se você não solicitou esta alteração, ignore este e-mail.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    // Do not log the request, response body, recipient, API key or recovery token.
    console.error('Resend password recovery rejected', response.status);
    throw new Error('Password recovery delivery failed');
  }
}
