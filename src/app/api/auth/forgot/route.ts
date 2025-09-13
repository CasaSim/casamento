import { NextResponse } from 'next/server';
import FormData from 'form-data';
import User from '@/models/User';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_KEY!,
});

export async function POST(req: Request) {
  await mongoose.connect(process.env.MONGODB_URI!);
  const { email } = await req.json();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  // Gere um token seguro
  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpire = Date.now() + 1000 * 60 * 60; // 1 hora

  user.resetPasswordToken = token;
  user.resetPasswordExpires = tokenExpire;
  await user.save();

  const resetUrl = `${process.env.URL}auth/reset-password?token=${token}`;

  const emailData = await mg.messages.create(
    process.env.MAILGUN_DOMAIN!, {
    from: 'Mailgun Sandbox <postmaster@sandbox7f416caa20524ce3adeab5e517a9b94f.mailgun.org>',
    to: email,
    subject: 'Recuperação de senha',
    html: `
      <p>Você solicitou a redefinição de senha.</p>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Se não foi você, ignore este e-mail.</p>
    `,
  });

  console.log('Email enviado:', emailData);

  return NextResponse.json({ message: 'E-mail de recuperação enviado.' });
}
