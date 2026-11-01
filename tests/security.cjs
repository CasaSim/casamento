/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerHooks, createRequire } = require('node:module');
const path = require('node:path');

const buildRoot = path.resolve(__dirname, '../.test-build');
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const file = path.join(buildRoot, `${specifier.slice(2)}.js`);
      return nextResolve(file, context);
    }
    return nextResolve(specifier, context);
  },
});

function load(file, mocks = {}) {
  const compiled = path.join(buildRoot, file.replace(/^src\//, '').replace(/\.ts$/, '.js'));
  const localRequire = createRequire(compiled);
  const originals = new Map();
  try {
    for (const [name, exports] of Object.entries(mocks)) {
      const id = name.startsWith('@/')
        ? path.join(buildRoot, `${name.slice(2)}.js`)
        : localRequire.resolve(name);
      originals.set(id, require.cache[id]);
      require.cache[id] = { id, filename: id, loaded: true, exports };
    }
    return localRequire(compiled);
  } finally {
    for (const [id, original] of originals) {
      if (original) require.cache[id] = original;
      else delete require.cache[id];
    }
  }
}
const security = load('src/lib/security.ts');
const request = (body, headers = {}) => new Request('https://casasim.test/api/test', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('rejects NoSQL operators, malformed email, weak/oversized passwords and invalid amounts', () => {
  for (const value of [undefined, null, { $ne: null }, ['a@b.com'], 'invalid', '@b.com', 'a@@b.com', 'a@b', 'a@.com', 'a@b.', 'a b@c.com', 'a@b c.com']) {
    assert.throws(() => security.emailAddress(value));
  }
  assert.equal(security.emailAddress(' A@B.COM '), 'a@b.com');
  assert.equal(security.emailAddress('first.last+tag@sub.example.com'), 'first.last+tag@sub.example.com');
  for (const value of ['short', 'a'.repeat(73), '💍'.repeat(20), { $gt: '' }]) {
    assert.throws(() => security.passwordValue(value));
  }
  for (const valor of [Number.NaN, Infinity, -1, 0, '10', { $gt: 0 }]) {
    assert.throws(() => security.expenseValues({ categoria: 'Buffet', valor }));
  }
  assert.throws(() => security.expenseValues({ categoria: { $ne: null }, valor: 10 }));
  for (const data of ['2026-02-30', '2026-13-01', '01/11/2026', { $gt: '' }]) {
    assert.throws(() => security.expenseValues({ categoria: 'Buffet', valor: 10, data }));
  }
  assert.throws(() => security.expenseValues({ categoria: 'Buffet', valor: 10, descricao: { $ne: null } }));
  const values = security.expenseValues({ categoria: 'Buffet', valor: 10, descricao: ' Entrada ', data: '2026-11-01' });
  assert.equal(values.descricao, 'Entrada');
  assert.equal(values.data.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(security.expenseValues({ categoria: 'Buffet', valor: 10, data: '' }).data, null);
});

test('rejects cross-origin writes, malformed JSON and oversized bodies', async () => {
  await assert.rejects(security.jsonBody(request({}, { origin: 'https://attacker.test' })), { status: 403 });
  await assert.rejects(security.jsonBody(request({}, { 'sec-fetch-site': 'cross-site' })), { status: 403 });
  await assert.rejects(security.jsonBody(request({ data: 'x'.repeat(17000) })), { status: 413 });
  await assert.rejects(security.jsonBody(request([])), { status: 400 });
  const malformed = new Request('https://casasim.test/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  await assert.rejects(security.jsonBody(malformed), { status: 400 });
  assert.equal((await security.jsonBody(request({ valid: true }))).valid, true);
});

test('limits streamed request bodies and cancels oversized input', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from('{"value":"'));
      controller.enqueue(Buffer.alloc(17000, 'x'));
    },
    cancel() { cancelled = true; },
  });
  const req = new Request('https://casasim.test/api/test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half',
  });
  await assert.rejects(security.jsonBody(req), { status: 413 });
  assert.equal(cancelled, true);

  const valid = new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from('{"valid":'));
      controller.enqueue(Buffer.from('true}'));
      controller.close();
    },
  });
  const body = await security.jsonBody(new Request('https://casasim.test/api/test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: valid, duplex: 'half',
  }));
  assert.equal(body.valid, true);
});

test('password reset hashes and consumes token atomically, revokes sessions, rejects reuse', async () => {
  let captured;
  const route = load('src/app/api/auth/reset/route.ts', {
    '@/lib/security': { ...security, rateLimit: async () => {} },
    '@/models/User': { findOneAndUpdate: async (filter, update) => {
      if (captured) return null;
      captured = { filter, update };
      return { _id: 'user' };
    } },
  });
  const token = 'ab'.repeat(32);
  const password = 'a secure password';
  assert.equal((await route.POST(request({ token, password }))).status, 200);
  assert.notEqual(captured.filter.resetPasswordToken, token);
  assert.equal(captured.filter.resetPasswordToken, require('node:crypto').createHash('sha256').update(token).digest('hex'));
  assert.equal(await require('bcryptjs').compare(password, captured.update.$set.password), true);
  assert.equal(captured.update.$inc.sessionVersion, 1);
  assert.equal(captured.update.$unset.resetPasswordToken, 1);
  assert.equal((await route.POST(request({ token, password }))).status, 400);
  assert.equal((await route.POST(request({ token: { $ne: null }, password }))).status, 400);
});

test('expense object operations require session and bind all queries to owner', async () => {
  let session = null;
  const filters = [];
  const expense = { _id: 'a'.repeat(24) };
  const record = async filter => { filters.push(filter); return expense; };
  const route = load('src/app/api/expenses/[id]/route.ts', {
    '@/lib/security': { ...security, connectDB: async () => {} },
    '@/lib/auth': {},
    'next-auth': { getServerSession: async () => session },
    '@/models/Expense': { findOne: record, findOneAndUpdate: record, findOneAndDelete: record },
    '@/models/Dashboard': { updateOne: async () => {} },
  });
  const context = { params: Promise.resolve({ id: expense._id }) };
  assert.equal((await route.GET(request({}), context)).status, 401);
  assert.equal(filters.length, 0);
  session = { user: { id: 'owner' } };
  assert.equal((await route.GET(request({}), context)).status, 200);
  assert.equal((await route.PUT(request({ categoria: 'Buffet', valor: 10, user: 'victim' }), context)).status, 200);
  assert.equal((await route.DELETE(request({}), context)).status, 200);
  for (const filter of filters) {
    assert.equal(filter.user, 'owner');
    assert.equal(filter._id, expense._id);
  }
});

test('login compares a generated dummy hash for unknown accounts and authenticates valid accounts', async () => {
  const bcrypt = require('bcryptjs');
  const comparisons = [];
  let account = null;
  const auth = load('src/lib/auth.ts', {
    '@/models/User': { findOne: async () => account },
    './security': { ...security, rateLimit: async () => {} },
    bcryptjs: {
      ...bcrypt,
      compare(password, hash) {
        comparisons.push(hash);
        return bcrypt.compare(password, hash);
      },
    },
  });
  const authorize = auth.authOptions.providers[0].options.authorize;
  const credentials = { email: 'a@example.test', password: 'valid test password' };
  assert.equal(await authorize(credentials), null);
  assert.equal(await authorize(credentials), null);
  assert.equal(comparisons.length, 2);
  assert.equal(comparisons[0], comparisons[1]);
  assert.equal(bcrypt.getRounds(comparisons[0]), 12);

  account = { _id: 'owner', email: credentials.email, name: 'Test', password: await bcrypt.hash(credentials.password, 12) };
  assert.deepEqual(await authorize(credentials), { id: 'owner', email: credentials.email, name: 'Test' });
  assert.equal(await authorize({ ...credentials, password: 'wrong password' }), null);
});
