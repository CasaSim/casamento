import { NextResponse } from 'next/server';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  await mongoose.connect(process.env.MONGODB_URI!);
  const { token, password } = await req.json();

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  }).then(user => {
      if (!user) {  
        return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
  }   
    user.password = bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.save();

  });




  return NextResponse.json({ message: 'Senha redefinida com sucesso.' });
}