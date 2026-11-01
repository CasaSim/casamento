import { NextRequest, NextResponse } from 'next/server';
import Expense from '@/models/Expense';
import Dashboard from '@/models/Dashboard';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { connectDB, expenseValues, HttpError, jsonBody, safeRoute } from '@/lib/security';

type Context = { params: Promise<{ id: string }> };

async function handle(request: NextRequest, context: Context, method: 'GET' | 'PUT' | 'DELETE') {
  return safeRoute(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new HttpError(401, 'Não autorizado.');
    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, 'Identificador inválido.');
    const values = method === 'PUT' ? expenseValues(await jsonBody(request)) : undefined;
    if (method === 'DELETE') {
      const origin = request.headers.get('origin');
      if ((origin && origin !== new URL(process.env.NEXTAUTH_URL || request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
        throw new HttpError(403, 'Origem não permitida.');
      }
    }
    await connectDB();
    // Always bind the object identifier to its authenticated owner.
    const filter = { _id: id, user: session.user.id };
    let expense;
    if (method === 'PUT') {
      expense = await Expense.findOneAndUpdate(filter, { $set: values }, { new: true, runValidators: true });
    } else if (method === 'DELETE') {
      expense = await Expense.findOneAndDelete(filter);
    } else {
      expense = await Expense.findOne(filter);
    }
    if (!expense) throw new HttpError(404, 'Gasto não encontrado.');
    if (method === 'DELETE') {
      await Dashboard.updateOne({ user: session.user.id }, { $pull: { expenses: expense._id } });
      return NextResponse.json({ message: 'Gasto deletado com sucesso.' });
    }
    return NextResponse.json(expense);
  });
}
export async function GET(req: NextRequest, context: Context) { return handle(req, context, 'GET'); }
export async function PUT(req: NextRequest, context: Context) { return handle(req, context, 'PUT'); }
export async function DELETE(req: NextRequest, context: Context) { return handle(req, context, 'DELETE'); }
