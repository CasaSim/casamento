import { NextRequest, NextResponse } from 'next/server';
import Expense from '@/models/Expense';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const expense = await Expense.findOne({ _id: params.id, user: session.user.id });
    if (!expense) {
      return NextResponse.json({ error: 'Gasto não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { categoria, valor } = await req.json();

    const expense = await Expense.findOneAndUpdate(
      { _id: params.id, user: session.user.id },
      { categoria, valor },
      { new: true }
    );

    if (!expense) {
      return NextResponse.json({ error: 'Gasto não encontrado ou não autorizado.' }, { status: 404 });
    }

    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const expense = await Expense.findOneAndDelete({
      _id: params.id,
      user: session.user.id,
    });

    if (!expense) {
      return NextResponse.json({ error: 'Gasto não encontrado ou não autorizado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Gasto deletado com sucesso.' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}