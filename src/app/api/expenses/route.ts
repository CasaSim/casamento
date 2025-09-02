import { NextResponse } from 'next/server';
import Expense from '@/models/Expense';
import Dashboard from '@/models/Dashboard';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  const { categoria, valor } = await req.json();

  if (!categoria || !valor) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }

  // Busca ou cria o dashboard do usuário
  let dashboard = await Dashboard.findOne({ user: session.user.id });
  if (!dashboard) {
    dashboard = await Dashboard.create({ user: session.user.id, expenses: [] });
  }

  // Cria o gasto e associa ao dashboard
  const expense = await Expense.create({
    categoria,
    valor,
    user: session.user.id
  });

  dashboard.expenses.push(expense._id);
  await dashboard.save();

  return NextResponse.json(expense, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  await mongoose.connect(process.env.MONGODB_URI!);

  const dashboard = await Dashboard.findOne({ user: session.user.id }).populate('expenses');
  if (!dashboard) {
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(dashboard.expenses, { status: 200 });
}