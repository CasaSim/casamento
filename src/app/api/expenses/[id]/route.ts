import { NextResponse } from 'next/server';
import Expense from '@/models/Expense';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

// Next.js 13+ API routes: context pode ser uma Promise
export async function GET(req: Request, contextPromise: Promise<{ params: { id: string } }>) {
  const context = await contextPromise;
  await mongoose.connect(process.env.MONGODB_URI!);
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const expense = await Expense.findOne({ _id: context.params.id, user: session.user.id });
  if (!expense) {
    return NextResponse.json({ error: 'Gasto não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(expense, { status: 200 });
}

export async function PUT(req: Request, contextPromise: Promise<{ params: { id: string } }>) {
  const context = await contextPromise;
  await mongoose.connect(process.env.MONGODB_URI!);
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { categoria, valor } = await req.json();

  const expense = await Expense.findOneAndUpdate(
    { _id: context.params.id, user: session.user.id },
    { categoria, valor },
    { new: true }
  );

  if (!expense) {
    return NextResponse.json({ error: 'Gasto não encontrado ou não autorizado.' }, { status: 404 });
  }

  return NextResponse.json(expense, { status: 200 });
}

export async function DELETE(req: Request, contextPromise: Promise<{ params: { id: string } }>) {
  const context = await contextPromise;
  await mongoose.connect(process.env.MONGODB_URI!);
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const expense = await Expense.findOneAndDelete({
    _id: context.params.id,
    user: session.user.id,
  });

  if (!expense) {
    return NextResponse.json({ error: 'Gasto não encontrado ou não autorizado.' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Gasto deletado com sucesso.' }, { status: 200 });
}