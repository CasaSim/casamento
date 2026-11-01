import { NextResponse } from 'next/server';
import Dashboard from '@/models/Dashboard';
import Expense from '@/models/Expense';
import { connectDB, HttpError, safeRoute } from '@/lib/security';

// Knowing the dashboard ID intentionally grants public read access only.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(404, 'Dashboard não encontrado.');
    await connectDB();
    const dashboard = await Dashboard.findById(id).select('user');
    if (!dashboard) throw new HttpError(404, 'Dashboard não encontrado.');
    // Select visible fields explicitly; never expose the owner or account data.
    // Scope by owner even if legacy expense references contain another user's ID.
    const expenses = await Expense.find({ user: dashboard.user })
      .select('_id categoria descricao data contato telefone valor').lean();
    return NextResponse.json(expenses);
  });
}
