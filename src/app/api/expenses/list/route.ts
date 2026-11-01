import { NextResponse } from 'next/server';
import Expense from '@/models/Expense';
import Dashboard from '@/models/Dashboard';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { connectDB, expenseValues, HttpError, jsonBody, safeRoute } from '@/lib/security';

export async function POST(req: Request) {
  return safeRoute(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new HttpError(401, 'Não autorizado.');
    const values = expenseValues(await jsonBody(req));
    await connectDB();
    const expense = await Expense.create({ ...values, user: session.user.id });
    await Dashboard.updateOne({ user: session.user.id }, { $push: { expenses: expense._id } }, { upsert: true });
    return NextResponse.json(expense, { status: 201 });
  });
}

export async function GET() {
  return safeRoute(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new HttpError(401, 'Não autorizado.');
    await connectDB();
    return NextResponse.json(await Expense.find({ user: session.user.id }));
  });
}
