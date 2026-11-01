import { NextResponse } from 'next/server';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { HttpError, jsonBody, passwordValue, rateLimit, safeRoute, text } from '@/lib/security';

export async function POST(req: Request) {
  return safeRoute(async () => {
    const body = await jsonBody(req);
    const token = text(body.token, 64);
    if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, 'Token inválido ou expirado.');
    const password = passwordValue(body.password);
    await rateLimit('reset-global', 'all', 100);
    const hashed = await bcrypt.hash(password, 12);
    // Consume the token atomically: concurrent requests cannot reuse it.
    const user = await User.findOneAndUpdate({
      resetPasswordToken: createHash('sha256').update(token).digest('hex'),
      resetPasswordExpires: { $gt: new Date() },
    }, {
      $set: { password: hashed },
      $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
      $inc: { sessionVersion: 1 },
    });
    if (!user) throw new HttpError(400, 'Token inválido ou expirado.');
    return NextResponse.json({ message: 'Senha redefinida com sucesso.' });
  });
}
