import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import User from '@/models/User';
import { recoveryConfig, sendRecoveryEmail } from '@/lib/password-recovery';
import { emailAddress, jsonBody, rateLimit, safeRoute } from '@/lib/security';

export async function POST(req: Request) {
  return safeRoute(async () => {
    const email = emailAddress((await jsonBody(req)).email);
    await rateLimit('forgot-global', 'all', 100);
    await rateLimit('forgot', email, 3);
    // Validate for every request so configuration failures do not expose accounts.
    recoveryConfig();
    const response = { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Confira também a caixa de spam.' };
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json(response);

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await User.updateOne({ _id: user._id }, { $set: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
    } });
    try {
      await sendRecoveryEmail(email, token);
    } catch {
      // Remove only this token; a newer concurrent request must remain valid.
      await User.updateOne({ _id: user._id, resetPasswordToken: tokenHash }, {
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
      });
      console.error('Password recovery delivery failed');
    }
    return NextResponse.json(response);
  });
}
