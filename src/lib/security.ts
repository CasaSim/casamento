import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI!);
}

export function text(value: unknown, max: number, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new HttpError(400, 'Dados inválidos.');
  }
  return value.trim();
}

export function emailAddress(value: unknown) {
  const email = text(value, 254).toLowerCase();
  const at = email.indexOf('@');
  const dot = email.lastIndexOf('.');
  if (at <= 0 || at !== email.lastIndexOf('@') || dot <= at + 1 || dot === email.length - 1 || /\s/.test(email)) {
    throw new HttpError(400, 'E-mail inválido.');
  }
  return email;
}

export function passwordValue(value: unknown) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, 'Use uma senha com pelo menos 12 caracteres e até 72 bytes.');
  }
  return value;
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  // Reject cross-origin browser writes; non-browser clients need authentication as usual.
  const origin = req.headers.get('origin');
  const expected = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  if ((origin && origin !== expected) || req.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'Origem não permitida.');
  }
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Envie JSON.');
  if (!req.body) throw new HttpError(400, 'JSON inválido.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  await req.body.pipeTo(new WritableStream<Uint8Array>({
    write(value) {
      size += value.byteLength;
      if (size > 16384) throw new HttpError(413, 'Dados muito grandes.');
      chunks.push(value);
    },
  }));
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object');
    return body;
  } catch { throw new HttpError(400, 'JSON inválido.'); }
}

export function expenseValues(body: Record<string, unknown>) {
  const categoria = text(body.categoria, 120);
  const contato = text(body.contato ?? '', 200, false);
  const telefone = text(body.telefone ?? '', 40, false);
  const descricao = text(body.descricao ?? '', 2000, false);
  let data: Date | null | undefined;
  if (body.data !== undefined) {
    if (body.data === '' || body.data === null) {
      data = null;
    } else {
      const value = text(body.data, 10);
      data = new Date(`${value}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== value) {
        throw new HttpError(400, 'Data inválida.');
      }
    }
  }
  if (typeof body.valor !== 'number' || !Number.isFinite(body.valor) || body.valor <= 0 || body.valor > 1e12) {
    throw new HttpError(400, 'Valor inválido.');
  }
  return { categoria, contato, telefone, descricao, ...(data !== undefined ? { data } : {}), valor: body.valor };
}

const LimitSchema = new mongoose.Schema({
  _id: String, count: Number, expires: { type: Date, expires: 0 },
});
const Limit = mongoose.models.SecurityLimit || mongoose.model('SecurityLimit', LimitSchema);

// Shared atomic counters across instances. TTL is cleanup only, never enforcement.
export async function rateLimit(scope: string, identity: string, max: number) {
  await connectDB();
  const window = Math.floor(Date.now() / 900000);
  const key = createHash('sha256').update(`${scope}:${identity}:${window}`).digest('hex');
  let entry;
  try {
    entry = await Limit.findOneAndUpdate({ _id: key }, {
      $inc: { count: 1 }, $setOnInsert: { expires: new Date((window + 2) * 900000) },
    }, { upsert: true, new: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    entry = await Limit.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { new: true });
  }
  if (!entry || entry.count > max) throw new HttpError(429, 'Muitas tentativas. Tente novamente mais tarde.');
}

export async function safeRoute(action: () => Promise<Response>) {
  try { return await action(); } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('API operation failed');
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
