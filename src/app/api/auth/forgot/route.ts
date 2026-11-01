import { NextResponse } from 'next/server';
import FormData from 'form-data';
import User from '@/models/User';
import { createHash, randomBytes } from 'node:crypto';
import Mailgun from 'mailgun.js';
import { emailAddress, jsonBody, rateLimit, safeRoute } from '@/lib/security';

export async function POST(req: Request) {
  return safeRoute(async () => {
    const email = emailAddress((await jsonBody(req)).email);
    await rateLimit('forgot-global', 'all', 100);
    await rateLimit('forgot', email, 3);
    const response = { message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.' };
    const base = new URL(process.env.NEXTAUTH_URL || process.env.URL!);
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') throw new Error('HTTPS required');
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json(response);
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await User.updateOne({ _id: user._id }, { $set: {
      resetPasswordToken: tokenHash, resetPasswordExpires: new Date(Date.now() + 3600000),
    } });
    const url = new URL('/auth/reset-password', base);
    url.searchParams.set('token', token);
    try {
      const mg = new Mailgun(FormData).client({ username: 'api', key: process.env.MAILGUN_KEY! });
      await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
        from: `CasaSim <postmaster@${process.env.MAILGUN_DOMAIN}>`, to: email,
        subject: 'Recuperação de senha',
        text: `Para redefinir sua senha, acesse: ${url.toString()}\nSe não foi você, ignore este e-mail.`,
      });
    } catch {
      await User.updateOne({ _id: user._id, resetPasswordToken: tokenHash }, {
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
      });
      console.error('Password recovery delivery failed');
    }
    return NextResponse.json(response);
  });
}
