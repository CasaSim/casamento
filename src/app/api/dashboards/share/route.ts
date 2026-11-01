import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import Dashboard from '@/models/Dashboard';
import { connectDB, HttpError, jsonBody, safeRoute } from '@/lib/security';

export async function POST(request: Request) {
  return safeRoute(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new HttpError(401, 'Não autorizado.');
    await jsonBody(request);
    await connectDB();
    const dashboard = await Dashboard.findOneAndUpdate(
      { user: session.user.id },
      { $setOnInsert: { user: session.user.id, expenses: [] } },
      { upsert: true, new: true },
    );
    return NextResponse.json({ id: dashboard._id.toString() });
  });
}
