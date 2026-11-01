import { NextResponse } from 'next/server';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { emailAddress, jsonBody, passwordValue, rateLimit, safeRoute, text } from '@/lib/security';

export async function POST(req: Request) {
  return safeRoute(async () => {
    const body = await jsonBody(req);
    const email = emailAddress(body.email);
    const name = text(body.name, 120);
    const password = passwordValue(body.password);
    await rateLimit('signup-global', 'all', 100);
    await rateLimit('signup', email, 5);
    const hashed = await bcrypt.hash(password, 12);
    try {
      await User.create({ name, email, password: hashed });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    return NextResponse.json({ message: 'Se o e-mail estiver disponível, o cadastro foi realizado. Faça login ou recupere sua senha.' }, { status: 201 });
  });
}
