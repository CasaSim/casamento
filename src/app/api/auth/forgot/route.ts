import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: Request) {
  await mongoose.connect(process.env.MONGODB_URI!);
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    // Generate a temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex'); // 16 characters long
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Update user's password in the database
    existingUser.password = hashedPassword;
    await existingUser.save();

    // Simulate sending a reset link with the temporary password
    console.log(`Password reset initiated for email: ${email}`);
    console.log(`Temporary password for ${email}: ${temporaryPassword}`);
    console.log(`Simulated reset link: http://localhost:3000/auth/reset-password?token=${temporaryPassword}`); // Example link
  }

  return NextResponse.json(
    { message: 'Se um usuário com este email existir, um link para redefinir a senha será enviado.' },
    { status: 200 }
  );
}
